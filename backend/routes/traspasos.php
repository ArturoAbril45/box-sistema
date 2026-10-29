<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('traspasos', $parts);
$id     = is_numeric($parts[$idx+1] ?? '') ? (int)$parts[$idx+1] : null;
$db     = getDB();

if ($method === 'GET') {
    $user   = requireAuth();
    $desde  = $_GET['desde'] ?? date('Y-m-01');
    $hasta  = $_GET['hasta'] ?? date('Y-m-d');
    $stmt = $db->prepare(
        "SELECT t.*,
                o.nombre AS almacen_origen_nombre,
                d.nombre AS almacen_destino_nombre,
                u.nombre AS usuario_nombre,
                dist.nombre AS distribuidor_nombre,
                COALESCE(po.foto, pd.foto) AS producto_foto
         FROM traspasos t
         LEFT JOIN tiendas o ON t.almacen_origen_id = o.id
         LEFT JOIN tiendas d ON t.almacen_destino_id = d.id
         LEFT JOIN usuarios u ON t.usuario_id = u.id
         LEFT JOIN usuarios dist ON t.distribuidor_id = dist.id
         LEFT JOIN productos po ON t.producto_origen_id = po.id
         LEFT JOIN productos pd ON t.producto_destino_id = pd.id
         WHERE DATE(t.fecha) BETWEEN ? AND ?
         ORDER BY t.fecha DESC LIMIT 500"
    );
    $stmt->execute([$desde, $hasta]);
    echo json_encode($stmt->fetchAll());

} elseif ($method === 'POST') {
    $user = requireAuth();
    $b = json_decode(file_get_contents('php://input'), true) ?? [];

    $loteId = bin2hex(random_bytes(10));
    $motivo = trim($b['motivo'] ?? '') ?: null;
    $distribuidorId = $b['distribuidor_id'] ?? null;
    // Cada item ahora trae su propio almacén destino.
    // Compatibilidad: si viene almacen_destino_id a nivel raíz, se usa como destino de todos los items que no lo especifiquen.
    $destinoGlobal = $b['almacen_destino_id'] ?? null;
    $items = $b['items'] ?? (isset($b['producto_id']) ? [['producto_id' => $b['producto_id'], 'cantidad' => $b['cantidad'] ?? 0, 'almacen_destino_id' => $destinoGlobal]] : []);

    if (empty($items)) {
        http_response_code(422);
        echo json_encode(['error' => 'Agrega al menos un producto a la lista']);
        exit;
    }

    // Validar todos los items antes de tocar la base de datos
    $origenes = [];
    foreach ($items as $item) {
        $productoOrigenId = $item['producto_id'] ?? null;
        $cantidad = (float) ($item['cantidad'] ?? 0);
        $almacenDestinoId = $item['almacen_destino_id'] ?? $destinoGlobal;

        if (!$productoOrigenId || $cantidad <= 0) {
            http_response_code(422);
            echo json_encode(['error' => 'Hay un producto sin cantidad válida en la lista']);
            exit;
        }
        if (!$almacenDestinoId) {
            http_response_code(422);
            echo json_encode(['error' => 'Falta elegir el almacén destino de uno de los productos']);
            exit;
        }

        $stmt = $db->prepare("SELECT * FROM productos WHERE id = ?");
        $stmt->execute([$productoOrigenId]);
        $origen = $stmt->fetch();

        if (!$origen) {
            http_response_code(404);
            echo json_encode(['error' => 'Uno de los productos de origen no fue encontrado']);
            exit;
        }
        if ($origen['tienda_id'] == $almacenDestinoId) {
            http_response_code(422);
            echo json_encode(['error' => "El origen y destino de \"{$origen['nombre']}\" no pueden ser el mismo almacén"]);
            exit;
        }
        if ($cantidad > $origen['stock']) {
            http_response_code(422);
            echo json_encode(['error' => "No hay stock suficiente de \"{$origen['nombre']}\" en el almacén de origen"]);
            exit;
        }

        $origenes[] = ['producto' => $origen, 'cantidad' => $cantidad, 'destino_id' => $almacenDestinoId];
    }

    $db->beginTransaction();
    try {
        foreach ($origenes as $entry) {
            $origen = $entry['producto'];
            $cantidad = $entry['cantidad'];
            $almacenDestinoId = $entry['destino_id'];
            $productoOrigenId = $origen['id'];

            // Buscar si el producto ya existe en el almacén destino (mismo nombre)
            $stmt = $db->prepare("SELECT * FROM productos WHERE nombre = ? AND tienda_id = ? AND activo = 1");
            $stmt->execute([$origen['nombre'], $almacenDestinoId]);
            $destino = $stmt->fetch();

            if ($destino) {
                $db->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?")
                   ->execute([$cantidad, $destino['id']]);
                $productoDestinoId = $destino['id'];
            } else {
                $db->prepare(
                    "INSERT INTO productos (codigo,nombre,descripcion,categoria_id,unidad,precio_compra,precio_mayor,precio_facturado,precio_sin_factura,stock,stock_minimo,stock_maximo,permite_dividir,tienda_id,foto,activo,visible_tienda)
                     VALUES (?,?,?,NULL,?,?,?,?,?,?,?,?,?,?,?,1,?)"
                )->execute([
                    $origen['codigo'], $origen['nombre'], $origen['descripcion'], $origen['unidad'],
                    $origen['precio_compra'], $origen['precio_mayor'], $origen['precio_facturado'], $origen['precio_sin_factura'],
                    $cantidad, $origen['stock_minimo'], $origen['stock_maximo'], $origen['permite_dividir'],
                    $almacenDestinoId, $origen['foto'], $origen['visible_tienda'],
                ]);
                $productoDestinoId = $db->lastInsertId();

                if ($origen['permite_dividir']) {
                    $d = $db->prepare("SELECT nombre, cantidad, precio_compra, precio_mayor, precio_sin_factura, precio_facturado FROM producto_divisiones WHERE producto_id = ?");
                    $d->execute([$productoOrigenId]);
                    foreach ($d->fetchAll() as $div) {
                        $db->prepare("INSERT INTO producto_divisiones (producto_id,nombre,cantidad,precio_compra,precio_mayor,precio_sin_factura,precio_facturado) VALUES (?,?,?,?,?,?,?)")
                           ->execute([$productoDestinoId, $div['nombre'], $div['cantidad'], $div['precio_compra'], $div['precio_mayor'], $div['precio_sin_factura'], $div['precio_facturado']]);
                    }
                }
            }

            $db->prepare("UPDATE productos SET stock = stock - ? WHERE id = ?")
               ->execute([$cantidad, $productoOrigenId]);

            $db->prepare(
                "INSERT INTO traspasos (producto_nombre,almacen_origen_id,almacen_destino_id,producto_origen_id,producto_destino_id,cantidad,motivo,usuario_id,distribuidor_id,lote_id)
                 VALUES (?,?,?,?,?,?,?,?,?,?)"
            )->execute([
                $origen['nombre'], $origen['tienda_id'], $almacenDestinoId,
                $productoOrigenId, $productoDestinoId, $cantidad, $motivo, $user['id'], $distribuidorId ?: null, $loteId,
            ]);
        }

        $db->commit();
        echo json_encode(['ok' => true, 'total' => count($origenes), 'lote_id' => $loteId]);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo realizar el traspaso: ' . $e->getMessage()]);
    }

} elseif ($method === 'DELETE' && ($id || !empty($_GET['lote_id']))) {
    $user = requireAuth();

    if (!empty($_GET['lote_id'])) {
        $stmt = $db->prepare("SELECT * FROM traspasos WHERE lote_id = ?");
        $stmt->execute([$_GET['lote_id']]);
        $lista = $stmt->fetchAll();
    } else {
        $stmt = $db->prepare("SELECT * FROM traspasos WHERE id = ?");
        $stmt->execute([$id]);
        $lista = $stmt->fetchAll();
    }

    if (!$lista) {
        http_response_code(404);
        echo json_encode(['error' => 'Traspaso no encontrado']);
        exit;
    }

    $db->beginTransaction();
    try {
        foreach ($lista as $traspaso) {
            if ($traspaso['producto_destino_id']) {
                $stmt = $db->prepare("SELECT stock FROM productos WHERE id = ?");
                $stmt->execute([$traspaso['producto_destino_id']]);
                $destino = $stmt->fetch();
                if ($destino && $destino['stock'] < $traspaso['cantidad']) {
                    throw new Exception("No se puede deshacer: ya se usó parte del stock de \"{$traspaso['producto_nombre']}\" en el almacén destino");
                }
                $db->prepare("UPDATE productos SET stock = stock - ? WHERE id = ?")
                   ->execute([$traspaso['cantidad'], $traspaso['producto_destino_id']]);
            }
            if ($traspaso['producto_origen_id']) {
                $db->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?")
                   ->execute([$traspaso['cantidad'], $traspaso['producto_origen_id']]);
            }

            $db->prepare("DELETE FROM traspasos WHERE id = ?")->execute([$traspaso['id']]);
        }

        $db->commit();
        echo json_encode(['ok' => true, 'total' => count($lista)]);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(422);
        echo json_encode(['error' => $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}
