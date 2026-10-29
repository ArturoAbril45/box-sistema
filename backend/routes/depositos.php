<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('depositos', $parts);
$id     = is_numeric($parts[$idx+1]??'') ? (int)$parts[$idx+1] : null;
$db     = getDB();

if ($method === 'GET') {
    $user = requireAuth(); $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $stmt = $db->prepare("SELECT * FROM depositos WHERE tienda_id=? AND activo=1 ORDER BY nombre"); $stmt->execute([$tienda]); echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $user = requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $db->prepare("INSERT INTO depositos (nombre,banco,numero_cuenta,saldo,tienda_id) VALUES (?,?,?,?,?)")->execute([$b['nombre'],$b['banco']??null,$b['numero_cuenta']??null,$b['saldo']??0,$b['tienda_id']??$user['tienda_id']]);
    echo json_encode(['id'=>$db->lastInsertId(),'ok'=>true]);
} elseif ($method === 'PUT' && $id) {
    requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $db->prepare("UPDATE depositos SET nombre=?,banco=?,numero_cuenta=?,saldo=? WHERE id=?")->execute([$b['nombre'],$b['banco']??null,$b['numero_cuenta']??null,$b['saldo']??0,$id]);
    echo json_encode(['ok'=>true]);
} elseif ($method === 'DELETE' && $id) {
    requireAuth(); $db->prepare("UPDATE depositos SET activo=0 WHERE id=?")->execute([$id]); echo json_encode(['ok'=>true]);
} else { http_response_code(405); echo json_encode(['error'=>'No permitido']); }
