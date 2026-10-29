<?php
$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

if ($method === 'GET') {
    requireAuth();
    $stmt = $db->query("SELECT clave, valor FROM configuracion");
    $cfg  = []; foreach ($stmt->fetchAll() as $r) $cfg[$r['clave']] = $r['valor'];
    echo json_encode($cfg);
} elseif ($method === 'PUT') {
    requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    foreach ($b as $k => $v) {
        $db->prepare("INSERT INTO configuracion (clave,valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor)")->execute([$k,$v]);
    }
    echo json_encode(['ok'=>true]);
} else { http_response_code(405); echo json_encode(['error'=>'No permitido']); }
