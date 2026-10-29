<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('ventas', $parts);
$id     = is_numeric($parts[$idx + 1] ?? '') ? (int)$parts[$idx + 1] : null;
$sub    = $id ? ($parts[$idx + 2] ?? '') : '';
$db     = getDB();

if ($method === 'GET' && !$id) {
    $user   = requireAuth();
    $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $desde  = $_GET['desde'] ?? date('Y-m-01');
    $hasta  = $_GET['hasta'] ?? date('Y-m-d');
    $estado = $_GET['estado'] ?? null;
    $sql = "SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id LEFT JOIN usuarios u ON v.usuario_id = u.id WHERE v.tienda_id = ? AND DATE(v.fecha) BETWEEN ? AND ?";
    $params = [$tienda, $desde, $hasta];
    if ($estado) { $sql .= " AND v.estado = ?"; $params[] = $estado; }
    $sql .= " ORDER BY v.fecha DESC";
    $stmt = $db->prepare($sql); $stmt->execute($params);
    echo json_encode($stmt->fetchAll());

} elseif ($method === 'GET' && $id) {
    requireAuth();
    $stmt = $db->prepare("SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id LEFT JOIN usuarios u ON v.usuario_id = u.id WHERE v.id = ?");
    $stmt->execute([$id]); $v = $stmt->fetch();
    if (!$v) { http_response_code(404); echo json_encode(['error' => 'No encontrado']); exit; }
    $items = $db->prepare("SELECT vi.*, p.nombre as producto_nombre, t.nombre as almacen_nombre FROM venta_items vi LEFT JOIN productos p ON vi.producto_id = p.id LEFT JOIN tiendas t ON p.tienda_id = t.id WHERE vi.venta_id = ?");
    $items->execute([$id]); $v['items'] = $items->fetchAll();
    echo json_encode($v);

} elseif ($method === 'POST' && !$id) {
    $user = requireAuth();
    $b    = json_decode(file_get_contents('php://input'), true);
    $db->beginTransaction();
    try {
        $numero = 'V-' . date('ymd') . '-' . str_pad(rand(1,999), 3, '0', STR_PAD_LEFT);
        // El monto fiado es lo que el cliente queda debiendo: NO cuenta como pagado.
        // Se usa el fiado explicito si viene; si no, se asume el total solo cuando toda la venta es fiado.
        $fiado  = isset($b['fiado']) ? max(0, (float)$b['fiado']) : ((($b['forma_pago'] ?? '') === 'fiado') ? (float)$b['total'] : 0);
        $pagado = isset($b['pagado']) ? (float)$b['pagado'] : max(0, (float)$b['total'] - $fiado);
        $saldo  = max(0, (float)$b['total'] - $pagado);
        $estado = ($fiado > 0) ? 'fiado' : (($saldo > 0) ? 'pendiente' : 'pagada');
        $stmt = $db->prepare("INSERT INTO ventas (numero,cliente_id,usuario_id,tienda_id,subtotal,descuento,total,pagado,saldo,forma_pago,estado,notas) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([$numero,$b['cliente_id']??null,$user['id'],$b['tienda_id']??$user['tienda_id'],$b['subtotal']??$b['total'],$b['descuento']??0,$b['total'],$pagado,$saldo,$b['forma_pago']??'efectivo',$estado,$b['notas']??null]);
        $vid = $db->lastInsertId();

        foreach ($b['items'] as $item) {
            $divisionCantidad = isset($item['division_cantidad']) && $item['division_cantidad'] !== null && $item['division_cantidad'] !== ''
                ? (float)$item['division_cantidad'] : null;

            $db->prepare("INSERT INTO venta_items (venta_id,producto_id,nombre_producto,cantidad,unidad,precio_unitario,descuento,subtotal,division_cantidad) VALUES (?,?,?,?,?,?,?,?,?)")
               ->execute([$vid,$item['producto_id']??null,$item['nombre_producto']??'',$item['cantidad'],$item['unidad']??'Unidad',$item['precio_unitario'],$item['descuento']??0,$item['subtotal'],$divisionCantidad]);

            if (!$item['producto_id']) continue;

            if ($divisionCantidad) {
                // Venta por fracción (ej: metros de un rollo): se descuenta del sobrante suelto
                // que ya quedó de una unidad abierta; si no alcanza, se "abre" (resta de stock)
                // la cantidad de unidades enteras necesaria para cubrir la diferencia.
                $p = $db->prepare("SELECT stock, cantidad_divisible, stock_fraccion_actual FROM productos WHERE id = ? FOR UPDATE");
                $p->execute([$item['producto_id']]);
                $prod = $p->fetch();
                if (!$prod) throw new Exception("Producto de \"{$item['nombre_producto']}\" no encontrado");

                $cantidadFraccion = (float)$item['cantidad'] * $divisionCantidad;
                $sobrante   = (float)$prod['stock_fraccion_actual'];
                $stockUnid  = (float)$prod['stock'];
                $cantDiv    = (float)$prod['cantidad_divisible'];
                $nuevoSobrante = $sobrante - $cantidadFraccion;
                $unidadesAbiertas = 0;
                if ($nuevoSobrante < 0) {
                    if ($cantDiv <= 0) throw new Exception("\"{$item['nombre_producto']}\" no tiene definida la cantidad por unidad (Total disponible)");
                    $deficit = -$nuevoSobrante;
                    $unidadesAbiertas = ceil($deficit / $cantDiv);
                    if ($stockUnid < $unidadesAbiertas) throw new Exception("No hay stock suficiente de \"{$item['nombre_producto']}\" para esta cantidad");
                    $nuevoSobrante = $sobrante + $unidadesAbiertas * $cantDiv - $cantidadFraccion;
                }
                $db->prepare("UPDATE productos SET stock = stock - ?, stock_fraccion_actual = ? WHERE id = ?")
                   ->execute([$unidadesAbiertas, $nuevoSobrante, $item['producto_id']]);
                $db->prepare("INSERT INTO movimientos (tipo,producto_id,cantidad,motivo,referencia_id,referencia_tipo,usuario_id,tienda_id) VALUES ('salida',?,?,?,?,?,?,?)")
                   ->execute([$item['producto_id'],$cantidadFraccion,'Venta '.$numero.' (fracción)',$vid,'venta',$user['id'],$b['tienda_id']??$user['tienda_id']]);
            } else {
                $db->prepare("UPDATE productos SET stock = stock - ? WHERE id = ?")->execute([$item['cantidad'], $item['producto_id']]);
                $db->prepare("INSERT INTO movimientos (tipo,producto_id,cantidad,motivo,referencia_id,referencia_tipo,usuario_id,tienda_id) VALUES ('salida',?,?,?,?,?,?,?)")
                   ->execute([$item['producto_id'],$item['cantidad'],'Venta '.$numero,$vid,'venta',$user['id'],$b['tienda_id']??$user['tienda_id']]);
            }
        }

        // Si quedó algo fiado (aunque el pago sea mixto), se crea el préstamo por el
        // monto fiado y se suma a la deuda del cliente, para que quede en el historial.
        if ($fiado > 0 && !empty($b['cliente_id'])) {
            $db->prepare("INSERT INTO prestamos (numero,cliente_id,venta_id,tienda_id,total,pagado,saldo,estado,fecha,fecha_limite) VALUES (?,?,?,?,?,0,?,'pendiente',CURDATE(),?)")
               ->execute(['P-'.$numero,$b['cliente_id'],$vid,$b['tienda_id']??$user['tienda_id'],$fiado,$fiado,$b['fecha_limite']??null]);
            $db->prepare("UPDATE clientes SET saldo_pendiente = saldo_pendiente + ? WHERE id = ?")->execute([$fiado,$b['cliente_id']]);
        }

        $db->commit();
        echo json_encode(['id' => $vid, 'numero' => $numero, 'ok' => true]);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
    }

} elseif ($method === 'PUT' && $id && $sub === 'anular') {
    requireAuth();
    $db->beginTransaction();
    try {
        $db->prepare("UPDATE ventas SET estado = 'anulada' WHERE id = ?")->execute([$id]);
        // Revertir stock
        $items = $db->prepare("SELECT * FROM venta_items WHERE venta_id = ?");
        $items->execute([$id]);
        foreach ($items->fetchAll() as $item) {
            if (!$item['producto_id']) continue;

            if (!empty($item['division_cantidad'])) {
                // Fue una venta por fracción: la cantidad revertida vuelve al sobrante suelto,
                // y si se junta lo suficiente para formar unidades enteras, se devuelven al stock.
                $p = $db->prepare("SELECT stock, cantidad_divisible, stock_fraccion_actual FROM productos WHERE id = ? FOR UPDATE");
                $p->execute([$item['producto_id']]);
                $prod = $p->fetch();
                if ($prod) {
                    $cantidadFraccion = (float)$item['cantidad'] * (float)$item['division_cantidad'];
                    $cantDiv = (float)$prod['cantidad_divisible'];
                    $nuevoSobrante = (float)$prod['stock_fraccion_actual'] + $cantidadFraccion;
                    $unidadesDevueltas = 0;
                    if ($cantDiv > 0) {
                        $unidadesDevueltas = floor($nuevoSobrante / $cantDiv);
                        $nuevoSobrante -= $unidadesDevueltas * $cantDiv;
                    }
                    $db->prepare("UPDATE productos SET stock = stock + ?, stock_fraccion_actual = ? WHERE id = ?")
                       ->execute([$unidadesDevueltas, $nuevoSobrante, $item['producto_id']]);
                }
            } else {
                $db->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?")->execute([$item['cantidad'], $item['producto_id']]);
            }
        }
        $db->commit();
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']);
}
