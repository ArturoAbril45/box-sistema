<?php
requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
// find index of 'cuentas-pagar'
$base = array_search('cuentas-pagar', $parts);
$id   = isset($parts[$base + 1]) && is_numeric($parts[$base + 1]) ? (int)$parts[$base + 1] : null;
$sub  = $id && isset($parts[$base + 2]) ? $parts[$base + 2] : null;

if ($method === 'GET' && !$id) {
    $tienda = $_GET['tienda_id'] ?? null;
    $estado = $_GET['estado'] ?? null;
    $prov   = $_GET['proveedor_id'] ?? null;
    $sql = "SELECT c.*, p.nombre as proveedor_nombre FROM cuentas_por_pagar c LEFT JOIN proveedores p ON c.proveedor_id=p.id WHERE c.tienda_id=?";
    $params = [$tienda];
    if ($estado) { $sql .= " AND c.estado=?"; $params[] = $estado; }
    if ($prov)   { $sql .= " AND c.proveedor_id=?"; $params[] = $prov; }
    $sql .= " ORDER BY c.fecha DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());

} elseif ($method === 'GET' && $id && !$sub) {
    $stmt = $pdo->prepare("SELECT c.*, p.nombre as proveedor_nombre FROM cuentas_por_pagar c LEFT JOIN proveedores p ON c.proveedor_id=p.id WHERE c.id=?");
    $stmt->execute([$id]);
    $cuenta = $stmt->fetch();
    if (!$cuenta) { http_response_code(404); echo json_encode(['error'=>'No encontrado']); exit; }
    $stmt2 = $pdo->prepare("SELECT * FROM cuentas_pagar_pagos WHERE cuenta_id=? ORDER BY fecha DESC");
    $stmt2->execute([$id]);
    $cuenta['pagos'] = $stmt2->fetchAll();
    echo json_encode($cuenta);

} elseif ($method === 'POST' && !$id) {
    $b = json_decode(file_get_contents('php://input'), true);
    $monto = floatval($b['monto_total']);
    $stmt = $pdo->prepare("INSERT INTO cuentas_por_pagar (proveedor_id,compra_id,tienda_id,concepto,monto_total,monto_pagado,saldo,estado,fecha,fecha_vencimiento,notas,usuario_id) VALUES (?,?,?,?,?,0,?,?,?,?,?,?)");
    $stmt->execute([$b['proveedor_id'],$b['compra_id']??null,$b['tienda_id'],$b['concepto'],$monto,$monto,'pendiente',$b['fecha']??date('Y-m-d'),$b['fecha_vencimiento']??null,$b['notas']??null,$b['usuario_id']??null]);
    echo json_encode(['ok'=>true,'id'=>$pdo->lastInsertId()]);

} elseif ($method === 'POST' && $id && $sub === 'pagar') {
    $b = json_decode(file_get_contents('php://input'), true);
    $monto = floatval($b['monto']);

    $stmt = $pdo->prepare("SELECT * FROM cuentas_por_pagar WHERE id=?");
    $stmt->execute([$id]);
    $cuenta = $stmt->fetch();
    if (!$cuenta) { http_response_code(404); echo json_encode(['error'=>'No encontrado']); exit; }

    $nuevo_pagado = floatval($cuenta['monto_pagado']) + $monto;
    $nuevo_saldo  = floatval($cuenta['monto_total']) - $nuevo_pagado;
    $nuevo_estado = $nuevo_saldo <= 0 ? 'pagado' : ($nuevo_pagado > 0 ? 'parcial' : 'pendiente');

    $pdo->prepare("INSERT INTO cuentas_pagar_pagos (cuenta_id,monto,forma_pago,usuario_id,notas) VALUES (?,?,?,?,?)")
        ->execute([$id,$monto,$b['forma_pago']??'efectivo',$b['usuario_id']??null,$b['notas']??null]);

    $pdo->prepare("UPDATE cuentas_por_pagar SET monto_pagado=?,saldo=?,estado=? WHERE id=?")
        ->execute([$nuevo_pagado,max(0,$nuevo_saldo),$nuevo_estado,$id]);

    echo json_encode(['ok'=>true,'saldo'=>max(0,$nuevo_saldo),'estado'=>$nuevo_estado]);

} elseif ($method === 'DELETE' && $id) {
    $pdo->prepare("DELETE FROM cuentas_por_pagar WHERE id=?")->execute([$id]);
    echo json_encode(['ok'=>true]);

} else {
    http_response_code(405); echo json_encode(['error'=>'No permitido']);
}
