<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('tienda-publica', $parts);
$sub    = $parts[$idx + 1] ?? '';
$db     = getDB();

// Leer tienda_id opcional desde query param (si no, muestra todos)
$tienda_id = $_GET['tienda_id'] ?? null;

if ($method === 'GET' && $sub === 'productos') {
    $search = '%' . ($_GET['q'] ?? '') . '%';
    $cat    = $_GET['categoria_id'] ?? null;

    // Si el mismo producto existe en varios almacenes (una fila por tienda_id),
    // se agrupa por nombre para mostrarlo una sola vez en la tienda pública,
    // sumando el stock disponible en todos los almacenes.
    $sql = "SELECT MIN(p.id) AS id, MIN(p.codigo) AS codigo, p.nombre, MIN(p.descripcion) AS descripcion, MIN(p.unidad) AS unidad,
                   MIN(p.precio_facturado) AS precio_facturado, MIN(p.precio_sin_factura) AS precio_sin_factura, MIN(p.precio_mayor) AS precio_mayor,
                   SUM(p.stock) AS stock, MIN(p.foto) AS foto, MAX(p.permite_dividir) AS permite_dividir,
                   MIN(c.nombre) AS categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = 1 AND p.visible_tienda = 1 AND p.nombre LIKE ?";
    $params = [$search];

    if ($tienda_id) { $sql .= " AND p.tienda_id = ?"; $params[] = $tienda_id; }
    if ($cat) {
        // La categoría puede repetirse (misma nombre) con distinto id por almacén,
        // así que se compara por nombre en vez de por id exacto.
        $sql .= " AND p.categoria_id IN (SELECT id FROM categorias WHERE nombre = (SELECT nombre FROM categorias WHERE id = ?))";
        $params[] = $cat;
    }

    $sql .= " GROUP BY p.nombre ORDER BY categoria_nombre ASC, p.nombre ASC";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $prods = $stmt->fetchAll();

    foreach ($prods as &$p) {
        if ($p['permite_dividir']) {
            $d = $db->prepare("SELECT nombre, cantidad, precio_facturado AS precio FROM producto_divisiones WHERE producto_id = ?");
            $d->execute([$p['id']]);
            $p['divisiones'] = $d->fetchAll();
        } else {
            $p['divisiones'] = [];
        }
    }
    echo json_encode($prods);

} elseif ($method === 'GET' && $sub === 'categorias') {
    $sql = "SELECT MIN(c.id) AS id, c.nombre
            FROM categorias c
            INNER JOIN productos p ON p.categoria_id = c.id
            WHERE p.activo = 1 AND p.visible_tienda = 1";
    $params = [];
    if ($tienda_id) { $sql .= " AND p.tienda_id = ?"; $params[] = $tienda_id; }
    $sql .= " GROUP BY c.nombre ORDER BY c.nombre ASC";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());

} else {
    http_response_code(404);
    echo json_encode(['error' => 'Ruta no encontrada']);
}
