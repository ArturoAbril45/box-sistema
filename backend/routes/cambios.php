<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('cambios', $parts);
$id     = is_numeric($parts[$idx+1]??'') ? (int)$parts[$idx+1] : null;
$db     = getDB();

if ($method === 'GET' && !$id) {
    $user = requireAuth(); $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $stmt = $db->prepare("SELECT c.*, cl.nombre as cliente_nombre, u.nombre as usuario_nombre FROM cambios c LEFT JOIN clientes cl ON c.cliente_id=cl.id LEFT JOIN usuarios u ON c.usuario_id=u.id WHERE c.tienda_id=? ORDER BY c.fecha DESC");
    $stmt->execute([$tienda]); echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $user = requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $db->beginTransaction();
    try {
        $numero = 'CAM-'.date('ymd').'-'.str_pad(rand(1,999),3,'0',STR_PAD_LEFT);
        $totalDev = array_sum(array_column(array_filter($b['items'],fn($i)=>$i['tipo']==='devuelto'),'subtotal'));
        $totalNuevo = array_sum(array_column(array_filter($b['items'],fn($i)=>$i['tipo']==='nuevo'),'subtotal'));
        $diff = $totalNuevo - $totalDev;
        $db->prepare("INSERT INTO cambios (numero,venta_id,cliente_id,tienda_id,motivo,total_devuelto,total_nuevo,diferencia,estado,usuario_id,notas) VALUES (?,?,?,?,?,?,?,?,'completado',?,?)")
           ->execute([$numero,$b['venta_id']??null,$b['cliente_id']??null,$b['tienda_id']??$user['tienda_id'],$b['motivo']??null,$totalDev,$totalNuevo,$diff,$user['id'],$b['notas']??null]);
        $cid = $db->lastInsertId();
        foreach ($b['items'] as $item) {
            $db->prepare("INSERT INTO cambio_items (cambio_id,tipo,producto_id,nombre_producto,cantidad,precio_unitario,subtotal) VALUES (?,?,?,?,?,?,?)")
               ->execute([$cid,$item['tipo'],$item['producto_id']??null,$item['nombre_producto']??'',$item['cantidad'],$item['precio'],$item['subtotal']]);
            if ($item['producto_id']) {
                $delta = $item['tipo']==='devuelto' ? $item['cantidad'] : -$item['cantidad'];
                $db->prepare("UPDATE productos SET stock=stock+? WHERE id=?")->execute([$delta,$item['producto_id']]);
            }
        }
        $db->commit(); echo json_encode(['id'=>$cid,'numero'=>$numero,'ok'=>true]);
    } catch(Exception $e) { $db->rollBack(); http_response_code(500); echo json_encode(['error'=>$e->getMessage()]); }
} else { http_response_code(405); echo json_encode(['error'=>'No permitido']); }
