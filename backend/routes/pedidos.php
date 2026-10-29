<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('pedidos', $parts);
$id     = is_numeric($parts[$idx+1]??'') ? (int)$parts[$idx+1] : null;
$sub    = $id ? ($parts[$idx+2]??'') : '';
$db     = getDB();

if ($method === 'GET' && !$id) {
    $user = requireAuth(); $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $stmt = $db->prepare("SELECT p.*, pv.nombre as proveedor_nombre FROM pedidos p LEFT JOIN proveedores pv ON p.proveedor_id=pv.id WHERE p.tienda_id=? ORDER BY p.fecha_pedido DESC");
    $stmt->execute([$tienda]); echo json_encode($stmt->fetchAll());
} elseif ($method === 'GET' && $id) {
    requireAuth();
    $stmt = $db->prepare("SELECT p.*, pv.nombre as proveedor_nombre FROM pedidos p LEFT JOIN proveedores pv ON p.proveedor_id=pv.id WHERE p.id=?"); $stmt->execute([$id]); $p = $stmt->fetch();
    $items = $db->prepare("SELECT pi.*, pr.nombre as producto_nombre FROM pedido_items pi LEFT JOIN productos pr ON pi.producto_id=pr.id WHERE pi.pedido_id=?"); $items->execute([$id]); $p['items'] = $items->fetchAll();
    echo json_encode($p);
} elseif ($method === 'POST' && !$id) {
    $user = requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $numero = 'PED-'.date('ymd').'-'.str_pad(rand(1,999),3,'0',STR_PAD_LEFT);
    $db->prepare("INSERT INTO pedidos (numero,proveedor_id,tienda_id,total_estimado,notas,fecha_pedido,fecha_estimada) VALUES (?,?,?,?,?,CURDATE(),?)")
       ->execute([$numero,$b['proveedor_id']??null,$b['tienda_id']??$user['tienda_id'],$b['total_estimado']??0,$b['notas']??null,$b['fecha_estimada']??null]);
    $pid = $db->lastInsertId();
    foreach (($b['items']??[]) as $item) {
        $db->prepare("INSERT INTO pedido_items (pedido_id,producto_id,nombre_producto,cantidad,precio_estimado) VALUES (?,?,?,?,?)")
           ->execute([$pid,$item['producto_id']??null,$item['nombre_producto']??'',$item['cantidad'],$item['precio_estimado']??0]);
    }
    echo json_encode(['id'=>$pid,'numero'=>$numero,'ok'=>true]);
} elseif ($method === 'POST' && $id && $sub === 'recibir') {
    $user = requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    foreach (($b['items']??[]) as $item) {
        $db->prepare("UPDATE pedido_items SET cantidad_recibida=cantidad_recibida+? WHERE id=?")->execute([$item['cantidad_recibida'],$item['id']]);
        if ($item['producto_id'] && $item['cantidad_recibida'] > 0) {
            $db->prepare("UPDATE productos SET stock=stock+? WHERE id=?")->execute([$item['cantidad_recibida'],$item['producto_id']]);
        }
    }
    $db->prepare("UPDATE pedidos SET estado=?,fecha_recepcion=CURDATE() WHERE id=?")->execute([$b['estado']??'recibido',$id]);
    echo json_encode(['ok'=>true]);
} else { http_response_code(405); echo json_encode(['error'=>'No permitido']); }
