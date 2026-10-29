<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('ingresos-egresos', $parts);
$id     = is_numeric($parts[$idx+1]??'') ? (int)$parts[$idx+1] : null;
$db     = getDB();

if ($method === 'GET') {
    $user = requireAuth(); $tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
    $desde = $_GET['desde'] ?? date('Y-m-01'); $hasta = $_GET['hasta'] ?? date('Y-m-d');
    $tipo  = $_GET['tipo'] ?? null;
    $sql   = "SELECT ie.*, u.nombre as usuario_nombre, d.nombre as deposito_nombre FROM ingresos_egresos ie LEFT JOIN usuarios u ON ie.usuario_id=u.id LEFT JOIN depositos d ON ie.deposito_id=d.id WHERE ie.tienda_id=? AND DATE(ie.fecha) BETWEEN ? AND ?";
    $p = [$tienda,$desde,$hasta];
    if ($tipo) { $sql .= " AND ie.tipo=?"; $p[] = $tipo; }
    $sql .= " ORDER BY ie.fecha DESC";
    $stmt = $db->prepare($sql); $stmt->execute($p); echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $user = requireAuth(); $b = json_decode(file_get_contents('php://input'),true);
    $caja = $db->prepare("SELECT id FROM cajas WHERE tienda_id=? AND estado='abierta' LIMIT 1");
    $caja->execute([$b['tienda_id']??$user['tienda_id']]); $cajaRow = $caja->fetch();
    $db->prepare("INSERT INTO ingresos_egresos (tipo,concepto,monto,forma_pago,deposito_id,caja_id,usuario_id,tienda_id,notas) VALUES (?,?,?,?,?,?,?,?,?)")
       ->execute([$b['tipo'],$b['concepto'],$b['monto'],$b['forma_pago']??'efectivo',$b['deposito_id']??null,$cajaRow['id']??null,$user['id'],$b['tienda_id']??$user['tienda_id'],$b['notas']??null]);
    if ($b['deposito_id']) {
        $delta = $b['tipo']==='ingreso' ? $b['monto'] : -$b['monto'];
        $db->prepare("UPDATE depositos SET saldo=saldo+? WHERE id=?")->execute([$delta,$b['deposito_id']]);
    }
    echo json_encode(['id'=>$db->lastInsertId(),'ok'=>true]);
} elseif ($method === 'DELETE' && $id) {
    requireAuth(); $db->prepare("DELETE FROM ingresos_egresos WHERE id=?")->execute([$id]); echo json_encode(['ok'=>true]);
} else { http_response_code(405); echo json_encode(['error'=>'No permitido']); }
