<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('prestamos', $parts);
$id     = is_numeric($parts[$idx + 1] ?? '') ? (int)$parts[$idx + 1] : null;
$sub    = $id ? ($parts[$idx + 2] ?? '') : '';
$db     = getDB();

if ($method === 'GET' && !$id) {
    $user   = requireAuth();
    $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $estado = $_GET['estado'] ?? null;
    $sql    = "SELECT p.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono FROM prestamos p LEFT JOIN clientes c ON p.cliente_id = c.id WHERE p.tienda_id = ?";
    $params = [$tienda];
    if ($estado) { $sql .= " AND p.estado = ?"; $params[] = $estado; }
    $sql .= " ORDER BY p.created_at DESC";
    $stmt = $db->prepare($sql); $stmt->execute($params);
    echo json_encode($stmt->fetchAll());

} elseif ($method === 'GET' && $id) {
    requireAuth();
    $stmt = $db->prepare("SELECT p.*, c.nombre as cliente_nombre FROM prestamos p LEFT JOIN clientes c ON p.cliente_id = c.id WHERE p.id = ?");
    $stmt->execute([$id]); $p = $stmt->fetch();
    $pagos = $db->prepare("SELECT pp.*, u.nombre as usuario_nombre FROM prestamo_pagos pp LEFT JOIN usuarios u ON pp.usuario_id = u.id WHERE pp.prestamo_id = ? ORDER BY pp.fecha DESC");
    $pagos->execute([$id]); $p['pagos'] = $pagos->fetchAll();
    echo json_encode($p);

} elseif ($method === 'POST' && !$id) {
    $user = requireAuth();
    $b    = json_decode(file_get_contents('php://input'), true);
    $numero = 'P-' . date('ymd') . '-' . str_pad(rand(1,999), 3, '0', STR_PAD_LEFT);
    $db->prepare("INSERT INTO prestamos (numero,cliente_id,tienda_id,total,pagado,saldo,estado,fecha,fecha_limite,notas) VALUES (?,?,?,?,0,?,'pendiente',CURDATE(),?,?)")
       ->execute([$numero,$b['cliente_id'],$b['tienda_id']??$user['tienda_id'],$b['total'],$b['total'],$b['fecha_limite']??null,$b['notas']??null]);
    $db->prepare("UPDATE clientes SET saldo_pendiente = saldo_pendiente + ? WHERE id = ?")->execute([$b['total'],$b['cliente_id']]);
    echo json_encode(['id' => $db->lastInsertId(), 'numero' => $numero, 'ok' => true]);

} elseif ($method === 'POST' && $id && $sub === 'pagar') {
    $user = requireAuth();
    $b    = json_decode(file_get_contents('php://input'), true);
    $monto = (float)$b['monto'];
    $db->prepare("INSERT INTO prestamo_pagos (prestamo_id,monto,forma_pago,usuario_id,notas) VALUES (?,?,?,?,?)")
       ->execute([$id,$monto,$b['forma_pago']??'efectivo',$user['id'],$b['notas']??null]);
    $stmt = $db->prepare("SELECT * FROM prestamos WHERE id = ?"); $stmt->execute([$id]);
    $p = $stmt->fetch();
    $nuevo_pagado = $p['pagado'] + $monto;
    $nuevo_saldo  = $p['total'] - $nuevo_pagado;
    $estado = $nuevo_saldo <= 0 ? 'pagado' : 'parcial';
    $db->prepare("UPDATE prestamos SET pagado = ?, saldo = ?, estado = ? WHERE id = ?")->execute([$nuevo_pagado, max(0,$nuevo_saldo), $estado, $id]);
    $db->prepare("UPDATE clientes SET saldo_pendiente = saldo_pendiente - ? WHERE id = ?")->execute([$monto,$p['cliente_id']]);
    echo json_encode(['ok' => true, 'saldo' => max(0,$nuevo_saldo)]);
} else {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']);
}
