<?php
// Catálogo global de productos (tienda_id IS NULL)
// GET    /catalogo            → lista todos
// POST   /catalogo            → crear producto en catálogo
// PUT    /catalogo/:id        → editar
// DELETE /catalogo/:id        → eliminar (solo del catálogo, no borra copias en sucursales)

$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('catalogo', $parts);
$id     = is_numeric($parts[$idx+1] ?? '') ? (int)$parts[$idx+1] : null;
$db     = getDB();

if ($method === 'GET') {
    requireAuth();
    $buscar = '%' . trim($_GET['q'] ?? '') . '%';
    $catId  = $_GET['categoria_id'] ?? null;
    $sql    = "SELECT p.*, c.nombre AS categoria_nombre
               FROM productos p
               LEFT JOIN categorias c ON p.categoria_id = c.id
               WHERE p.tienda_id IS NULL AND p.activo = 1 AND p.nombre LIKE ?";
    $params = [$buscar];
    if ($catId) { $sql .= " AND p.categoria_id = ?"; $params[] = $catId; }
    $sql .= " ORDER BY p.nombre";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());

} elseif ($method === 'POST' && !$id) {
    requireAuth();
    $b = json_decode(file_get_contents('php://input'), true) ?? [];
    if (empty($b['nombre'])) { http_response_code(422); echo json_encode(['error'=>'El nombre es requerido']); exit; }

    $db->prepare(
        "INSERT INTO productos (codigo,nombre,descripcion,categoria_id,unidad,
         precio_compra,precio_mayor,precio_facturado,precio_sin_factura,
         stock,stock_minimo,stock_maximo,permite_dividir,tienda_id,activo,visible_tienda)
         VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,NULL,1,1)"
    )->execute([
        $b['codigo']           ?? null,
        $b['nombre'],
        $b['descripcion']      ?? null,
        $b['categoria_id']     ?? null,
        $b['unidad']           ?? 'Unidad',
        $b['precio_compra']    ?? 0,
        $b['precio_mayor']     ?? 0,
        $b['precio_facturado'] ?? 0,
        $b['precio_sin_factura'] ?? 0,
        $b['stock_minimo']     ?? 0,
        $b['stock_maximo']     ?? 0,
        $b['permite_dividir']  ?? 0,
    ]);
    echo json_encode(['id' => $db->lastInsertId(), 'ok' => true]);

} elseif ($method === 'PUT' && $id) {
    requireAuth();
    $b = json_decode(file_get_contents('php://input'), true) ?? [];
    $db->prepare(
        "UPDATE productos SET codigo=?,nombre=?,descripcion=?,categoria_id=?,unidad=?,
         precio_compra=?,precio_mayor=?,precio_facturado=?,precio_sin_factura=?,
         stock_minimo=?,stock_maximo=?,permite_dividir=?
         WHERE id=? AND tienda_id IS NULL"
    )->execute([
        $b['codigo']             ?? null,
        $b['nombre']             ?? '',
        $b['descripcion']        ?? null,
        $b['categoria_id']       ?? null,
        $b['unidad']             ?? 'Unidad',
        $b['precio_compra']      ?? 0,
        $b['precio_mayor']       ?? 0,
        $b['precio_facturado']   ?? 0,
        $b['precio_sin_factura'] ?? 0,
        $b['stock_minimo']       ?? 0,
        $b['stock_maximo']       ?? 0,
        $b['permite_dividir']    ?? 0,
        $id,
    ]);
    echo json_encode(['ok' => true]);

} elseif ($method === 'DELETE' && $id) {
    requireAuth();
    $db->prepare("UPDATE productos SET activo=0 WHERE id=? AND tienda_id IS NULL")->execute([$id]);
    echo json_encode(['ok' => true]);

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}
