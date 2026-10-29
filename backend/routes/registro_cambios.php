<?php
$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

if ($method === 'GET') {
    $user = requireAuth(); $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $desde = $_GET['desde'] ?? date('Y-m-01'); $hasta = $_GET['hasta'] ?? date('Y-m-d');
    $stmt = $db->prepare("SELECT rc.*, u.nombre as usuario_nombre FROM registro_cambios rc LEFT JOIN usuarios u ON rc.usuario_id=u.id WHERE (rc.tienda_id=? OR rc.tienda_id IS NULL) AND DATE(rc.created_at) BETWEEN ? AND ? ORDER BY rc.created_at DESC LIMIT 200");
    $stmt->execute([$tienda,$desde,$hasta]); echo json_encode($stmt->fetchAll());
} else { http_response_code(405); echo json_encode(['error'=>'No permitido']); }
