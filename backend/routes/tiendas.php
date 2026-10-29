<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('tiendas', $parts);
$id     = is_numeric($parts[$idx+1]??'') ? (int)$parts[$idx+1] : null;
$db     = getDB();

$tipoParam      = $_GET['tipo']        ?? null;
$sucursalParam  = $_GET['sucursal_id'] ?? null;

if ($method === 'GET') {
    requireAuth();
    $where  = ['activa=1'];
    $params = [];
    if ($tipoParam)     { $where[] = 'tipo=?';         $params[] = $tipoParam; }
    if ($sucursalParam) { $where[] = 'sucursal_id=?';  $params[] = $sucursalParam; }
    $sql  = "SELECT * FROM tiendas WHERE " . implode(' AND ', $where) . " ORDER BY tipo, nombre";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());

} elseif ($method === 'POST' && !$id) {
    requireAuth();
    $b           = json_decode(file_get_contents('php://input'), true);
    $tipo        = in_array($b['tipo'] ?? '', ['sucursal','deposito']) ? $b['tipo'] : 'sucursal';
    $sucursalId  = ($tipo === 'deposito' && !empty($b['sucursal_id'])) ? (int)$b['sucursal_id'] : null;

    $db->prepare("INSERT INTO tiendas (nombre,tipo,sucursal_id,direccion,telefono) VALUES (?,?,?,?,?)")
       ->execute([$b['nombre'], $tipo, $sucursalId, $b['direccion']??null, $b['telefono']??null]);
    $newId = $db->lastInsertId();

    $copiados = 0;
    if ($tipo === 'sucursal') {
        $boxer = $db->query("SELECT MIN(id) as id FROM tiendas WHERE tipo='sucursal' AND activa=1")->fetch();
        $boxerId = $boxer['id'] ?? 1;
        $catStmt = $db->prepare("SELECT * FROM productos WHERE tienda_id=? AND activo=1");
        $catStmt->execute([$boxerId]);
        $insStmt = $db->prepare(
            "INSERT INTO productos
             (codigo,nombre,descripcion,categoria_id,unidad,
              precio_compra,precio_mayor,precio_facturado,precio_sin_factura,
              stock,stock_minimo,permite_dividir,tienda_id,activo,visible_tienda)
             VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,1,?)"
        );
        foreach ($catStmt->fetchAll() as $p) {
            $insStmt->execute([
                $p['codigo'], $p['nombre'], $p['descripcion'], $p['categoria_id'], $p['unidad'],
                $p['precio_compra'], $p['precio_mayor'], $p['precio_facturado'], $p['precio_sin_factura'],
                $p['stock_minimo'], $p['permite_dividir'],
                $newId, $p['visible_tienda'],
            ]);
            $copiados++;
        }
    }

    echo json_encode(['id' => $newId, 'tipo' => $tipo, 'sucursal_id' => $sucursalId, 'productos_copiados' => $copiados, 'ok' => true]);

} elseif ($method === 'PUT' && $id) {
    requireAuth();
    // Soporta multipart (logo upload) o JSON normal
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($ct, 'multipart/form-data')) {
        $b = $_POST;
    } else {
        $b = json_decode(file_get_contents('php://input'), true) ?? [];
    }
    $tipo       = in_array($b['tipo'] ?? '', ['sucursal','deposito']) ? $b['tipo'] : 'sucursal';
    $sucursalId = ($tipo === 'deposito' && !empty($b['sucursal_id'])) ? (int)$b['sucursal_id'] : null;

    // Manejar subida de logo
    $logoSql = '';
    $logoVal = null;
    if (!empty($_FILES['logo']['tmp_name'])) {
        $dir = __DIR__ . '/../uploads/logos/';
        if (!is_dir($dir)) mkdir($dir, 0777, true);
        $ext   = strtolower(pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION));
        $fname = 'tienda_' . $id . '_' . uniqid() . '.' . $ext;
        move_uploaded_file($_FILES['logo']['tmp_name'], $dir . $fname);
        $logoVal = '/backend/uploads/logos/' . $fname;
        $logoSql = ',logo=?';
    } elseif (array_key_exists('logo', $b)) {
        $logoVal = $b['logo'] ?: null;
        $logoSql = ',logo=?';
    }

    $params = [$b['nombre'], $tipo, $sucursalId, $b['direccion']??null, $b['telefono']??null];
    if ($logoVal !== null || $logoSql) $params[] = $logoVal;
    $params[] = $id;

    $db->prepare("UPDATE tiendas SET nombre=?,tipo=?,sucursal_id=?,direccion=?,telefono=?{$logoSql} WHERE id=?")
       ->execute($params);
    echo json_encode(['ok' => true, 'logo' => $logoVal]);

} elseif ($method === 'DELETE' && $id) {
    requireAuth();
    $db->prepare("UPDATE tiendas SET activa=0 WHERE id=?")->execute([$id]);
    echo json_encode(['ok' => true]);

} else {
    http_response_code(405);
    echo json_encode(['error' => 'No permitido']);
}
