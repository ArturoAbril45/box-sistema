<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('clientes', $parts);
$id     = is_numeric($parts[$idx+1]??'') ? (int)$parts[$idx+1] : null;
$db     = getDB();

if ($method === 'GET' && !$id) {
    $user = requireAuth(); $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $q = '%'.($_GET['q']??'').'%'; $tipo = $_GET['tipo'] ?? null;
    $sql = "SELECT * FROM clientes WHERE tienda_id=? AND activo=1 AND nombre LIKE ?";
    $p = [$tienda,$q];
    if ($tipo) { $sql .= " AND tipo IN (?,?)"; $p[] = $tipo; $p[] = 'ambos'; }
    $sql .= " ORDER BY nombre ASC";
    $stmt = $db->prepare($sql); $stmt->execute($p); echo json_encode($stmt->fetchAll());
} elseif ($method === 'GET' && $id) {
    requireAuth(); $stmt = $db->prepare("SELECT * FROM clientes WHERE id=?"); $stmt->execute([$id]); echo json_encode($stmt->fetch());
} elseif ($method === 'POST') {
    $user = requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $db->prepare("INSERT INTO clientes (nombre,telefono,direccion,empresa,nit,correo,tipo,tienda_id) VALUES (?,?,?,?,?,?,?,?)")
       ->execute([$b['nombre'],$b['telefono']??null,$b['direccion']??null,$b['empresa']??null,$b['nit']??null,$b['correo']??null,$b['tipo']??'ventas',$b['tienda_id']??$user['tienda_id']]);
    echo json_encode(['id'=>$db->lastInsertId(),'ok'=>true]);
} elseif ($method === 'PUT' && $id) {
    requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $db->prepare("UPDATE clientes SET nombre=?,telefono=?,direccion=?,empresa=?,nit=?,correo=?,tipo=? WHERE id=?")
       ->execute([$b['nombre'],$b['telefono']??null,$b['direccion']??null,$b['empresa']??null,$b['nit']??null,$b['correo']??null,$b['tipo']??'ventas',$id]);
    echo json_encode(['ok'=>true]);
} elseif ($method === 'DELETE' && $id) {
    requireAuth(); $db->prepare("UPDATE clientes SET activo=0 WHERE id=?")->execute([$id]); echo json_encode(['ok'=>true]);
} else { http_response_code(405); echo json_encode(['error'=>'Método no permitido']); }
