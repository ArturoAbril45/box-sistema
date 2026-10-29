<?php
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$id = isset($segments[2]) && is_numeric($segments[2]) ? (int)$segments[2] : null;

if ($method === 'GET' && !$id) {
    $tienda = $_GET['tienda_id'] ?? null;
    $sql = 'SELECT * FROM empleados WHERE activo=1';
    $params = [];
    if ($tienda) { $sql .= ' AND tienda_id=?'; $params[] = $tienda; }
    $sql .= ' ORDER BY nombre';
    $stmt = $pdo->prepare($sql); $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $b = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare('INSERT INTO empleados (nombre,cargo,telefono,salario,tienda_id) VALUES (?,?,?,?,?)');
    $stmt->execute([$b['nombre'], $b['cargo']??null, $b['telefono']??null, $b['salario']??0, $b['tienda_id']??null]);
    echo json_encode(['id' => $pdo->lastInsertId(), 'message' => 'Empleado creado']);
} elseif ($method === 'PUT' && $id) {
    $b = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare('UPDATE empleados SET nombre=?,cargo=?,telefono=?,salario=? WHERE id=?');
    $stmt->execute([$b['nombre'], $b['cargo']??null, $b['telefono']??null, $b['salario']??0, $id]);
    echo json_encode(['message' => 'Actualizado']);
} elseif ($method === 'DELETE' && $id) {
    $pdo->prepare('UPDATE empleados SET activo=0 WHERE id=?')->execute([$id]);
    echo json_encode(['message' => 'Eliminado']);
} else {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']);
}
