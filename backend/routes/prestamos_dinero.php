<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('prestamos-dinero', $parts);
$id     = is_numeric($parts[$idx + 1] ?? '') ? (int)$parts[$idx + 1] : null;
$sub    = $id ? ($parts[$idx + 2] ?? '') : '';
$db     = getDB();

if ($method === 'GET' && !$id) {
    $user   = requireAuth();
    $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $tipo   = $_GET['tipo'] ?? null;
    $estado = $_GET['estado'] ?? null;
    $sql    = "SELECT pd.*, u.nombre as usuario_nombre FROM prestamos_dinero pd LEFT JOIN usuarios u ON pd.usuario_id = u.id WHERE pd.tienda_id = ?";
    $params = [$tienda];
    if ($tipo)   { $sql .= " AND pd.tipo = ?";   $params[] = $tipo; }
    if ($estado) { $sql .= " AND pd.estado = ?"; $params[] = $estado; }
    $sql .= " ORDER BY pd.created_at DESC";
    $stmt = $db->prepare($sql); $stmt->execute($params);
    echo json_encode($stmt->fetchAll());

} elseif ($method === 'GET' && $id) {
    requireAuth();
    $stmt = $db->prepare("SELECT * FROM prestamos_dinero WHERE id = ?"); $stmt->execute([$id]);
    $p = $stmt->fetch();
    $pagos = $db->prepare("SELECT pdp.*, u.nombre as usuario_nombre FROM prestamos_dinero_pagos pdp LEFT JOIN usuarios u ON pdp.usuario_id = u.id WHERE pdp.prestamo_dinero_id = ? ORDER BY pdp.fecha DESC");
    $pagos->execute([$id]); $p['pagos'] = $pagos->fetchAll();
    echo json_encode($p);

} elseif ($method === 'POST' && !$id) {
    $user = requireAuth();
    $b    = json_decode(file_get_contents('php://input'), true);
    $db->prepare("INSERT INTO prestamos_dinero (tipo,persona,concepto,monto,pagado,saldo,estado,tienda_id,usuario_id,fecha,fecha_limite,notas) VALUES (?,?,?,?,0,?,'pendiente',?,?,CURDATE(),?,?)")
       ->execute([$b['tipo'],$b['persona'],$b['concepto']??null,$b['monto'],$b['monto'],$b['tienda_id']??$user['tienda_id'],$user['id'],$b['fecha_limite']??null,$b['notas']??null]);
    echo json_encode(['id' => $db->lastInsertId(), 'ok' => true]);

} elseif ($method === 'POST' && $id && $sub === 'pagar') {
    $user  = requireAuth();
    $b     = json_decode(file_get_contents('php://input'), true);
    $monto = (float)$b['monto'];
    $db->prepare("INSERT INTO prestamos_dinero_pagos (prestamo_dinero_id,monto,forma_pago,usuario_id,notas) VALUES (?,?,?,?,?)")
       ->execute([$id,$monto,$b['forma_pago']??'efectivo',$user['id'],$b['notas']??null]);
    $stmt = $db->prepare("SELECT * FROM prestamos_dinero WHERE id = ?"); $stmt->execute([$id]);
    $p = $stmt->fetch();
    $nuevo_pagado = $p['pagado'] + $monto;
    $nuevo_saldo  = $p['total'] - $nuevo_pagado;
    $estado = $nuevo_saldo <= 0 ? 'pagado' : 'parcial';
    $db->prepare("UPDATE prestamos_dinero SET pagado=?, saldo=?, estado=? WHERE id=?")->execute([$nuevo_pagado,max(0,$nuevo_saldo),$estado,$id]);
    echo json_encode(['ok' => true]);
} else {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']);
}
