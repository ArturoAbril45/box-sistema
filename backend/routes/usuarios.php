<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('usuarios', $parts);
$id     = is_numeric($parts[$idx+1]??'') ? (int)$parts[$idx+1] : null;
$db     = getDB();

if ($method === 'GET') {
    requireAuth();
    $stmt = $db->prepare("SELECT u.id,u.nombre,u.username,u.rol,u.tienda_id,u.activo,t.nombre as tienda_nombre FROM usuarios u LEFT JOIN tiendas t ON u.tienda_id=t.id WHERE u.activo=1 ORDER BY u.nombre"); $stmt->execute(); echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $hash = password_hash($b['password'], PASSWORD_BCRYPT);
    $db->prepare("INSERT INTO usuarios (nombre,username,password,rol,tienda_id) VALUES (?,?,?,?,?)")->execute([$b['nombre'],$b['username'],$hash,$b['rol']??'vendedor',$b['tienda_id']??null]);
    echo json_encode(['id'=>$db->lastInsertId(),'ok'=>true]);
} elseif ($method === 'PUT' && $id) {
    requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    if (!empty($b['password'])) {
        $hash = password_hash($b['password'], PASSWORD_BCRYPT);
        $db->prepare("UPDATE usuarios SET nombre=?,username=?,password=?,rol=?,tienda_id=? WHERE id=?")->execute([$b['nombre'],$b['username'],$hash,$b['rol']??'vendedor',$b['tienda_id']??null,$id]);
    } else {
        $db->prepare("UPDATE usuarios SET nombre=?,username=?,rol=?,tienda_id=? WHERE id=?")->execute([$b['nombre'],$b['username'],$b['rol']??'vendedor',$b['tienda_id']??null,$id]);
    }
    echo json_encode(['ok'=>true]);
} elseif ($method === 'DELETE' && $id) {
    requireAuth(); $db->prepare("UPDATE usuarios SET activo=0 WHERE id=?")->execute([$id]); echo json_encode(['ok'=>true]);
} else { http_response_code(405); echo json_encode(['error'=>'No permitido']); }
