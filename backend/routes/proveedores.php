<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('proveedores', $parts);
$id     = is_numeric($parts[$idx+1]??'') ? (int)$parts[$idx+1] : null;
$db     = getDB();

if ($method === 'GET' && !$id) {
    $user = requireAuth(); $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $stmt = $db->prepare("SELECT * FROM proveedores WHERE tienda_id=? AND activo=1 ORDER BY nombre"); $stmt->execute([$tienda]); echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $user = requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $db->prepare("INSERT INTO proveedores (nombre,celular,correo,dni,ciudad,origen,tienda_id) VALUES (?,?,?,?,?,?,?)")
       ->execute([$b['nombre'],$b['celular']??null,$b['correo']??null,$b['dni']??null,$b['ciudad']??null,$b['origen']??null,$b['tienda_id']??$user['tienda_id']]);
    echo json_encode(['id'=>$db->lastInsertId(),'ok'=>true]);
} elseif ($method === 'PUT' && $id) {
    requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $db->prepare("UPDATE proveedores SET nombre=?,celular=?,correo=?,dni=?,ciudad=?,origen=? WHERE id=?")
       ->execute([$b['nombre'],$b['celular']??null,$b['correo']??null,$b['dni']??null,$b['ciudad']??null,$b['origen']??null,$id]);
    echo json_encode(['ok'=>true]);
} elseif ($method === 'DELETE' && $id) {
    requireAuth(); $db->prepare("UPDATE proveedores SET activo=0 WHERE id=?")->execute([$id]); echo json_encode(['ok'=>true]);
} else { http_response_code(405); echo json_encode(['error'=>'No permitido']); }
