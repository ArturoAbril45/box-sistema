<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('compras', $parts);
$id     = is_numeric($parts[$idx+1]??'') ? (int)$parts[$idx+1] : null;
$db     = getDB();

if ($method === 'GET' && !$id) {
    $user = requireAuth(); $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $desde = $_GET['desde'] ?? date('Y-m-01'); $hasta = $_GET['hasta'] ?? date('Y-m-d');
    $stmt = $db->prepare("SELECT c.*, p.nombre as proveedor_nombre, u.nombre as usuario_nombre FROM compras c LEFT JOIN proveedores p ON c.proveedor_id=p.id LEFT JOIN usuarios u ON c.usuario_id=u.id WHERE c.tienda_id=? AND DATE(c.fecha) BETWEEN ? AND ? ORDER BY c.fecha DESC");
    $stmt->execute([$tienda,$desde,$hasta]); echo json_encode($stmt->fetchAll());
} elseif ($method === 'GET' && $id) {
    requireAuth();
    $stmt = $db->prepare("SELECT c.*, p.nombre as proveedor_nombre FROM compras c LEFT JOIN proveedores p ON c.proveedor_id=p.id WHERE c.id=?"); $stmt->execute([$id]); $c = $stmt->fetch();
    $items = $db->prepare("SELECT * FROM compra_items WHERE compra_id=?"); $items->execute([$id]); $c['items'] = $items->fetchAll();
    echo json_encode($c);
} elseif ($method === 'POST') {
    $user = requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $db->beginTransaction();
    try {
        $numero = 'C-'.date('ymd').'-'.str_pad(rand(1,999),3,'0',STR_PAD_LEFT);
        $db->prepare("INSERT INTO compras (numero,proveedor_id,usuario_id,tienda_id,total,pagado,saldo,forma_pago,estado,notas) VALUES (?,?,?,?,?,?,?,?,?,?)")
           ->execute([$numero,$b['proveedor_id']??null,$user['id'],$b['tienda_id']??$user['tienda_id'],$b['total'],$b['pagado']??$b['total'],max(0,$b['total']-($b['pagado']??$b['total'])),$b['forma_pago']??'efectivo','pagada',$b['notas']??null]);
        $cid = $db->lastInsertId();

        // Si la compra queda debiendo, se registra automaticamente la deuda en
        // Cuentas por Pagar, ligada a este proveedor y a esta compra, para que
        // aparezca sola en el historial de deudas a proveedores.
        $pagadoCompra = $b['pagado'] ?? $b['total'];
        $saldoCompra  = max(0, $b['total'] - $pagadoCompra);
        if ($saldoCompra > 0 && !empty($b['proveedor_id'])) {
            $estadoCta = $pagadoCompra > 0 ? 'parcial' : 'pendiente';
            $db->prepare("INSERT INTO cuentas_por_pagar (proveedor_id,compra_id,tienda_id,concepto,monto_total,monto_pagado,saldo,estado,fecha,fecha_vencimiento,notas,usuario_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
               ->execute([$b['proveedor_id'], $cid, $b['tienda_id']??$user['tienda_id'], 'Compra '.$numero, $b['total'], $pagadoCompra, $saldoCompra, $estadoCta, date('Y-m-d'), null, $b['notas']??null, $user['id']]);
        }

        foreach ($b['items'] as $item) {
            $db->prepare("INSERT INTO compra_items (compra_id,producto_id,nombre_producto,cantidad,unidad,precio_unitario,subtotal) VALUES (?,?,?,?,?,?,?)")
               ->execute([$cid,$item['producto_id']??null,$item['nombre_producto']??'',$item['cantidad'],$item['unidad']??'Unidad',$item['precio_unitario'],$item['subtotal']]);
            $itemId = $db->lastInsertId();

            // Distribucion por sucursal/almacen — si no viene, cae toda la cantidad
            // al producto original (comportamiento de antes, retrocompatible).
            $distribucion = $item['distribucion'] ?? ($item['producto_id'] ? [['tienda_id' => null, 'cantidad' => $item['cantidad']]] : []);

            $codigoOrigen = null;
            if ($item['producto_id']) {
                $po = $db->prepare("SELECT * FROM productos WHERE id=?");
                $po->execute([$item['producto_id']]);
                $prodOrigen = $po->fetch();
                $codigoOrigen = $prodOrigen['codigo'] ?? null;
            }

            foreach ($distribucion as $dist) {
                $cantDist = (float)($dist['cantidad'] ?? 0);
                if ($cantDist <= 0 || !$item['producto_id']) continue;
                $tid = $dist['tienda_id'] ?? $prodOrigen['tienda_id'];

                // Buscar el producto (mismo codigo) en la sucursal/almacen destino
                if ((int)$tid === (int)$prodOrigen['tienda_id']) {
                    $destino = $prodOrigen;
                } else {
                    // Primero por codigo (mas confiable); si no hay match, cae a nombre exacto
                    // por si el codigo se desincronizo entre sucursales.
                    $destino = null;
                    if ($codigoOrigen) {
                        $bstmt = $db->prepare("SELECT * FROM productos WHERE tienda_id=? AND codigo=? LIMIT 1");
                        $bstmt->execute([$tid, $codigoOrigen]);
                        $destino = $bstmt->fetch();
                    }
                    if (!$destino) {
                        $bstmt = $db->prepare("SELECT * FROM productos WHERE tienda_id=? AND nombre=? LIMIT 1");
                        $bstmt->execute([$tid, $prodOrigen['nombre']]);
                        $destino = $bstmt->fetch();
                    }
                    if (!$destino) {
                        // No existe todavia en ese almacen: se crea una copia (stock 0 inicial, igual que al crear un producto)
                        $db->prepare("INSERT INTO productos (codigo,nombre,descripcion,categoria_id,unidad,precio_compra,precio_mayor,precio_facturado,precio_sin_factura,stock,stock_minimo,stock_maximo,permite_dividir,tienda_id,foto,visible_tienda) VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?)")
                           ->execute([
                               $prodOrigen['codigo'], $prodOrigen['nombre'], $prodOrigen['descripcion'], $prodOrigen['categoria_id'], $prodOrigen['unidad'],
                               $item['precio_unitario'], $item['precio_mayor'] ?? $prodOrigen['precio_mayor'], $item['precio_facturado'] ?? $prodOrigen['precio_facturado'], $item['precio_sin_factura'] ?? $prodOrigen['precio_sin_factura'],
                               $prodOrigen['stock_minimo'], $prodOrigen['stock_maximo'], $prodOrigen['permite_dividir'], $tid, $prodOrigen['foto'], $prodOrigen['visible_tienda'],
                           ]);
                        $destId = $db->lastInsertId();
                        $destino = ['id' => $destId, 'stock' => 0];
                    }
                }

                $stockAnterior = (float)$destino['stock'];
                $stockNuevo    = $stockAnterior + $cantDist;

                // COALESCE: si el item de la compra no trae un precio (null), se conserva
                // el que ya tenia el producto en vez de borrarlo.
                $db->prepare("UPDATE productos SET stock=?, precio_compra=?, precio_mayor=COALESCE(?,precio_mayor), precio_facturado=COALESCE(?,precio_facturado), precio_sin_factura=COALESCE(?,precio_sin_factura), stock_minimo=COALESCE(?,stock_minimo), stock_maximo=COALESCE(?,stock_maximo) WHERE id=?")
                   ->execute([
                       $stockNuevo, $item['precio_unitario'],
                       $item['precio_mayor'] ?? null,
                       $item['precio_facturado'] ?? null,
                       $item['precio_sin_factura'] ?? null,
                       $item['stock_minimo'] ?? null,
                       $item['stock_maximo'] ?? null,
                       $destino['id']
                   ]);

                $db->prepare("INSERT INTO movimientos (tipo,producto_id,cantidad,cantidad_anterior,cantidad_nueva,motivo,referencia_id,referencia_tipo,usuario_id,tienda_id) VALUES ('entrada',?,?,?,?,?,?,?,?,?)")
                   ->execute([$destino['id'], $cantDist, $stockAnterior, $stockNuevo, "Compra $numero", $cid, 'compra', $user['id'], $tid]);

                $db->prepare("INSERT INTO compra_item_distribucion (compra_item_id,tienda_id,cantidad,producto_id_destino) VALUES (?,?,?,?)")
                   ->execute([$itemId, $tid, $cantDist, $destino['id']]);
            }
        }
        $db->commit(); echo json_encode(['id'=>$cid,'numero'=>$numero,'ok'=>true]);
    } catch(Exception $e) { $db->rollBack(); http_response_code(500); echo json_encode(['error'=>$e->getMessage()]); }
} else { http_response_code(405); echo json_encode(['error'=>'No permitido']); }
