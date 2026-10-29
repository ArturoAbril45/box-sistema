<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('reportes', $parts);
$tipo   = $parts[$idx+1] ?? 'resumen';
$db     = getDB();
$user   = requireAuth();
$tienda = $_GET['tienda_id'] ?? $user['tienda_id'];
$desde  = $_GET['desde'] ?? date('Y-m-01');
$hasta  = $_GET['hasta'] ?? date('Y-m-d');

if ($tipo === 'resumen') {
    $ventas    = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as total FROM ventas WHERE tienda_id=? AND DATE(fecha) BETWEEN ? AND ? AND estado!='anulada'"); $ventas->execute([$tienda,$desde,$hasta]); $rv = $ventas->fetch();
    $compras   = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as total FROM compras WHERE tienda_id=? AND DATE(fecha) BETWEEN ? AND ? AND estado!='anulada'"); $compras->execute([$tienda,$desde,$hasta]); $rc = $compras->fetch();
    $prestamos = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(saldo),0) as saldo_total FROM prestamos WHERE tienda_id=? AND estado IN ('pendiente','parcial')"); $prestamos->execute([$tienda]); $rp = $prestamos->fetch();
    $ingresos  = $db->prepare("SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END),0) as ingresos, COALESCE(SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END),0) as egresos FROM ingresos_egresos WHERE tienda_id=? AND DATE(fecha) BETWEEN ? AND ?"); $ingresos->execute([$tienda,$desde,$hasta]); $ri = $ingresos->fetch();
    $stock_bajo = $db->prepare("SELECT COUNT(*) as cnt FROM productos WHERE tienda_id=? AND activo=1 AND stock <= stock_minimo AND stock_minimo > 0"); $stock_bajo->execute([$tienda]); $rsb = $stock_bajo->fetch();
    echo json_encode(['ventas'=>$rv,'compras'=>$rc,'prestamos'=>$rp,'flujo'=>$ri,'stock_bajo'=>$rsb['cnt']]);

} elseif ($tipo === 'ventas-dia') {
    $stmt = $db->prepare("SELECT DATE(v.fecha) as dia, COUNT(*) as cantidad, SUM(v.total) as total FROM ventas v WHERE v.tienda_id=? AND DATE(v.fecha) BETWEEN ? AND ? AND v.estado!='anulada' GROUP BY DATE(v.fecha) ORDER BY dia DESC");
    $stmt->execute([$tienda,$desde,$hasta]); echo json_encode($stmt->fetchAll());

} elseif ($tipo === 'productos-mas-vendidos') {
    $stmt = $db->prepare("SELECT vi.nombre_producto, SUM(vi.cantidad) as cantidad_total, SUM(vi.subtotal) as monto_total FROM venta_items vi JOIN ventas v ON vi.venta_id=v.id WHERE v.tienda_id=? AND DATE(v.fecha) BETWEEN ? AND ? AND v.estado!='anulada' GROUP BY vi.nombre_producto ORDER BY cantidad_total DESC LIMIT 20");
    $stmt->execute([$tienda,$desde,$hasta]); echo json_encode($stmt->fetchAll());

} elseif ($tipo === 'stock') {
    $stmt = $db->prepare("SELECT p.*, c.nombre as categoria_nombre FROM productos p LEFT JOIN categorias c ON p.categoria_id=c.id WHERE p.tienda_id=? AND p.activo=1 ORDER BY p.stock ASC");
    $stmt->execute([$tienda]); echo json_encode($stmt->fetchAll());

} elseif ($tipo === 'prestamos-cobros') {
    $stmt = $db->prepare("SELECT p.*, c.nombre as cliente_nombre FROM prestamos p LEFT JOIN clientes c ON p.cliente_id=c.id WHERE p.tienda_id=? AND DATE(p.created_at) BETWEEN ? AND ? ORDER BY p.created_at DESC");
    $stmt->execute([$tienda,$desde,$hasta]); echo json_encode($stmt->fetchAll());
} else {
    http_response_code(404); echo json_encode(['error'=>'Reporte no encontrado']);
}
