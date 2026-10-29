<?php
requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $tienda = $_GET['tienda_id'] ?? null;
    $fecha  = $_GET['fecha'] ?? date('Y-m-d');
    $stmt = $pdo->prepare("SELECT a.*, e.nombre as empleado_nombre, e.cargo FROM asistencia a LEFT JOIN empleados e ON a.empleado_id=e.id WHERE a.tienda_id=? AND a.fecha=? ORDER BY e.nombre");
    $stmt->execute([$tienda, $fecha]);
    echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $b = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("INSERT INTO asistencia (empleado_id,tienda_id,fecha,estado,hora_entrada,hora_salida,notas) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE estado=VALUES(estado),hora_entrada=VALUES(hora_entrada),hora_salida=VALUES(hora_salida),notas=VALUES(notas)");
    $hora_auto = date('H:i:s');
    $stmt->execute([$b['empleado_id'],$b['tienda_id']??null,$b['fecha']??date('Y-m-d'),$b['estado']??'presente',$hora_auto,$b['hora_salida']??null,$b['notas']??null]);
    echo json_encode(['ok' => true]);
} else {
    http_response_code(405); echo json_encode(['error' => 'No permitido']);
}
