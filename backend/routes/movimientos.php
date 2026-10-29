<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('movimientos', $parts);
$id     = is_numeric($parts[$idx+1]??'') ? (int)$parts[$idx+1] : null;
$db     = getDB();

if ($method === 'GET') {
    $user = requireAuth(); $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $desde = $_GET['desde'] ?? date('Y-m-01'); $hasta = $_GET['hasta'] ?? date('Y-m-d');
    $stmt = $db->prepare("SELECT m.*, p.nombre as producto_nombre, u.nombre as usuario_nombre FROM movimientos m LEFT JOIN productos p ON m.producto_id=p.id LEFT JOIN usuarios u ON m.usuario_id=u.id WHERE m.tienda_id=? AND DATE(m.fecha) BETWEEN ? AND ? ORDER BY m.fecha DESC LIMIT 500");
    $stmt->execute([$tienda,$desde,$hasta]); echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $user = requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $stmt = $db->prepare("SELECT stock FROM productos WHERE id=?"); $stmt->execute([$b['producto_id']]); $prod = $stmt->fetch();
    $nueva = $b['tipo']==='entrada' ? $prod['stock']+$b['cantidad'] : ($b['tipo']==='ajuste' ? $b['cantidad'] : $prod['stock']-$b['cantidad']);
    $db->prepare("INSERT INTO movimientos (tipo,producto_id,cantidad,cantidad_anterior,cantidad_nueva,motivo,usuario_id,tienda_id) VALUES (?,?,?,?,?,?,?,?)")
       ->execute([$b['tipo'],$b['producto_id'],$b['cantidad'],$prod['stock'],$nueva,$b['motivo']??null,$user['id'],$b['tienda_id']??$user['tienda_id']]);
    $db->prepare("UPDATE productos SET stock=? WHERE id=?")->execute([$nueva,$b['producto_id']]);
    echo json_encode(['ok'=>true,'stock_nuevo'=>$nueva]);
} else { http_response_code(405); echo json_encode(['error'=>'No permitido']); }
