<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('caja', $parts);
$id     = is_numeric($parts[$idx + 1] ?? '') ? (int)$parts[$idx + 1] : null;
$sub    = $id ? ($parts[$idx + 2] ?? '') : ($parts[$idx + 1] ?? '');
$db     = getDB();

if ($method === 'GET' && $sub === 'actual') {
    $user   = requireAuth();
    $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $stmt   = $db->prepare("SELECT * FROM cajas WHERE tienda_id = ? AND estado = 'abierta' ORDER BY id DESC LIMIT 1");
    $stmt->execute([$tienda]); $caja = $stmt->fetch();
    if (!$caja) { echo json_encode(null); exit; }
    // Calcular totales del día
    $ventas = $db->prepare("SELECT COALESCE(SUM(pagado),0) as total FROM ventas WHERE caja_id = ? AND estado != 'anulada'");
    $ventas->execute([$caja['id']]); $caja['total_ventas'] = $ventas->fetchColumn();
    $compras = $db->prepare("SELECT COALESCE(SUM(pagado),0) as total FROM compras WHERE caja_id = ? AND estado != 'anulada'");
    $compras->execute([$caja['id']]); $caja['total_compras'] = $compras->fetchColumn();
    $ingresos = $db->prepare("SELECT COALESCE(SUM(monto),0) as total FROM ingresos_egresos WHERE caja_id = ? AND tipo = 'ingreso'");
    $ingresos->execute([$caja['id']]); $caja['total_ingresos'] = $ingresos->fetchColumn();
    $egresos = $db->prepare("SELECT COALESCE(SUM(monto),0) as total FROM ingresos_egresos WHERE caja_id = ? AND tipo = 'egreso'");
    $egresos->execute([$caja['id']]); $caja['total_egresos'] = $egresos->fetchColumn();
    $caja['saldo_actual'] = $caja['monto_apertura'] + $caja['total_ventas'] - $caja['total_compras'] + $caja['total_ingresos'] - $caja['total_egresos'];
    echo json_encode($caja);

} elseif ($method === 'GET' && !$id) {
    $user   = requireAuth();
    $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $stmt   = $db->prepare("SELECT c.*, u.nombre as usuario_nombre FROM cajas c LEFT JOIN usuarios u ON c.usuario_id = u.id WHERE c.tienda_id = ? ORDER BY c.fecha DESC LIMIT 60");
    $stmt->execute([$tienda]); echo json_encode($stmt->fetchAll());

} elseif ($method === 'POST' && $sub === 'abrir') {
    $user = requireAuth();
    $b    = json_decode(file_get_contents('php://input'), true);
    $tienda = $b['tienda_id'] ?? $user['tienda_id'];
    // Verificar si ya hay caja abierta
    $existe = $db->prepare("SELECT id FROM cajas WHERE tienda_id = ? AND estado = 'abierta'");
    $existe->execute([$tienda]);
    if ($existe->fetch()) { http_response_code(400); echo json_encode(['error' => 'Ya hay una caja abierta']); exit; }
    $db->prepare("INSERT INTO cajas (tienda_id,usuario_id,fecha,monto_apertura,estado) VALUES (?,?,CURDATE(),?,'abierta')")
       ->execute([$tienda,$user['id'],$b['monto_apertura']??0]);
    echo json_encode(['id' => $db->lastInsertId(), 'ok' => true]);

} elseif ($method === 'POST' && $id && $sub === 'cerrar') {
    requireAuth();
    $b = json_decode(file_get_contents('php://input'), true);
    $db->prepare("UPDATE cajas SET estado='cerrada', monto_cierre=?, notas=? WHERE id=?")
       ->execute([$b['monto_cierre']??0,$b['notas']??null,$id]);
    echo json_encode(['ok' => true]);
} else {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']);
}
