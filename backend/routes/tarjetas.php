<?php
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

if ($method === 'GET') {
    $user = requireAuth(); $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $desde = $_GET['desde'] ?? date('Y-m-01'); $hasta = $_GET['hasta'] ?? date('Y-m-d');
    $stmt = $db->prepare("SELECT tr.*, tr.created_at as fecha, u.nombre as usuario_nombre FROM tarjetas_recargas tr LEFT JOIN usuarios u ON tr.usuario_id=u.id WHERE tr.tienda_id=? AND DATE(tr.created_at) BETWEEN ? AND ? ORDER BY tr.created_at DESC");
    $stmt->execute([$tienda,$desde,$hasta]); echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $user = requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $db->prepare("INSERT INTO tarjetas_recargas (tipo,descripcion,monto,forma_pago,cliente_nombre,usuario_id,tienda_id,notas) VALUES (?,?,?,?,?,?,?,?)")
       ->execute([$b['tipo']??'otro',$b['descripcion']??null,$b['monto'],$b['forma_pago']??'efectivo',$b['cliente_nombre']??null,$user['id'],$b['tienda_id']??$user['tienda_id'],$b['notas']??null]);
    echo json_encode(['id'=>$db->lastInsertId(),'ok'=>true]);
} else { http_response_code(405); echo json_encode(['error'=>'No permitido']); }
