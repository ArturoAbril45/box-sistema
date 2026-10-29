<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$idx    = array_search('productos', $parts);
$id     = is_numeric($parts[$idx + 1] ?? '') ? (int)$parts[$idx + 1] : null;
$sub    = $id ? ($parts[$idx + 2] ?? '') : '';
$db     = getDB();

// Actualizar: POST /productos/{id}?action=editar
if ($method === 'POST' && ($_GET['action'] ?? '') === 'editar') {
    requireAuth();
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($ct, 'multipart/form-data') || str_contains($ct, 'application/x-www-form-urlencoded')) {
        $b = $_POST;
        $b['divisiones'] = json_decode($b['divisiones'] ?? '[]', true) ?: [];
    } else {
        $b = json_decode(file_get_contents('php://input'), true) ?? [];
    }
    $fotoSql = '';
    $fotoVal = null;
    if (!empty($_FILES['foto']['tmp_name'])) {
        $dir = __DIR__ . '/../uploads/';
        if (!is_dir($dir)) mkdir($dir, 0777, true);
        $ext = strtolower(pathinfo($_FILES['foto']['name'], PATHINFO_EXTENSION));
        $fname = uniqid('prod_') . '.' . $ext;
        move_uploaded_file($_FILES['foto']['tmp_name'], $dir . $fname);
        $fotoVal = '/backend/uploads/' . $fname;
        $fotoSql = ',foto=?';
    } elseif (!empty($b['foto_actual'])) {
        $fotoVal = $b['foto_actual'];
        $fotoSql = ',foto=?';
    }
    $params = [$b['codigo']??null,$b['nombre']??'',$b['descripcion']??null,$b['categoria_id']??null,$b['unidad']??'Unidad',$b['precio_compra']??0,$b['precio_mayor']??0,$b['precio_facturado']??0,$b['precio_sin_factura']??0,$b['stock']??0,$b['stock_minimo']??0,$b['permite_dividir']??0,$b['cantidad_divisible']??0,isset($b['visible_tienda']) ? (int)$b['visible_tienda'] : 1];
    if ($fotoVal !== null) $params[] = $fotoVal;
    $params[] = $id;
    $db->prepare("UPDATE productos SET codigo=?,nombre=?,descripcion=?,categoria_id=?,unidad=?,precio_compra=?,precio_mayor=?,precio_facturado=?,precio_sin_factura=?,stock=?,stock_minimo=?,permite_dividir=?,cantidad_divisible=?,visible_tienda=?{$fotoSql} WHERE id=?")
       ->execute($params);
    $db->prepare("DELETE FROM producto_divisiones WHERE producto_id = ?")->execute([$id]);
    foreach (($b['divisiones'] ?? []) as $div) {
        $db->prepare("INSERT INTO producto_divisiones (producto_id,nombre,cantidad,precio_compra,precio_mayor,precio_sin_factura,precio_facturado) VALUES (?,?,?,?,?,?,?)")
           ->execute([$id,$div['nombre'],$div['cantidad'],$div['precio_compra']??0,$div['precio_mayor']??0,$div['precio_sin_factura']??0,$div['precio_facturado']??0]);
    }

    // Sincronizar precios/descripcion/fracciones con las copias del mismo producto
    // en otras sucursales/almacenes (mismo codigo). El stock NUNCA se sincroniza,
    // cada sucursal mantiene su propia cantidad.
    if (!empty($b['codigo'])) {
        $sib = $db->prepare("SELECT id FROM productos WHERE codigo = ? AND id != ?");
        $sib->execute([$b['codigo'], $id]);
        $hermanos = $sib->fetchAll();
        if ($hermanos) {
            $updSib = $db->prepare("UPDATE productos SET nombre=?,descripcion=?,categoria_id=?,unidad=?,precio_compra=?,precio_mayor=?,precio_facturado=?,precio_sin_factura=?,stock_minimo=?,permite_dividir=?,cantidad_divisible=?,visible_tienda=? WHERE id=?");
            foreach ($hermanos as $h) {
                $updSib->execute([$b['nombre']??'',$b['descripcion']??null,$b['categoria_id']??null,$b['unidad']??'Unidad',$b['precio_compra']??0,$b['precio_mayor']??0,$b['precio_facturado']??0,$b['precio_sin_factura']??0,$b['stock_minimo']??0,$b['permite_dividir']??0,$b['cantidad_divisible']??0,isset($b['visible_tienda']) ? (int)$b['visible_tienda'] : 1,$h['id']]);
                $db->prepare("DELETE FROM producto_divisiones WHERE producto_id = ?")->execute([$h['id']]);
                foreach (($b['divisiones'] ?? []) as $div) {
                    $db->prepare("INSERT INTO producto_divisiones (producto_id,nombre,cantidad,precio_compra,precio_mayor,precio_sin_factura,precio_facturado) VALUES (?,?,?,?,?,?,?)")
                       ->execute([$h['id'],$div['nombre'],$div['cantidad'],$div['precio_compra']??0,$div['precio_mayor']??0,$div['precio_sin_factura']??0,$div['precio_facturado']??0]);
                }
            }
        }
    }

    echo json_encode(['ok' => true]);
    exit;
}

if ($method === 'GET' && !$id) {
    requireAuth();
    $tienda  = $_GET['tienda_id'] ?? null;
    $search  = '%' . ($_GET['q'] ?? '') . '%';
    $cat     = $_GET['categoria_id'] ?? null;
    $sql = "SELECT p.*, c.nombre as categoria_nombre, t.nombre as tienda_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN tiendas t ON p.tienda_id = t.id
            WHERE p.activo = 1 AND p.nombre LIKE ?";
    $params = [$search];
    if ($tienda) { $sql .= " AND p.tienda_id = ?"; $params[] = $tienda; }
    if ($cat)    { $sql .= " AND p.categoria_id = ?"; $params[] = $cat; }
    $sql .= " ORDER BY t.nombre ASC, p.nombre ASC";
    $stmt = $db->prepare($sql); $stmt->execute($params);
    $prods = $stmt->fetchAll();
    foreach ($prods as &$p) {
        $d = $db->prepare("SELECT * FROM producto_divisiones WHERE producto_id = ?");
        $d->execute([$p['id']]);
        $p['divisiones'] = $d->fetchAll();
    }
    echo json_encode($prods);

} elseif ($method === 'GET' && $id) {
    requireAuth();
    $stmt = $db->prepare("SELECT p.*, c.nombre as categoria_nombre FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?");
    $stmt->execute([$id]); $p = $stmt->fetch();
    if (!$p) { http_response_code(404); echo json_encode(['error' => 'No encontrado']); exit; }
    $d = $db->prepare("SELECT * FROM producto_divisiones WHERE producto_id = ?");
    $d->execute([$id]); $p['divisiones'] = $d->fetchAll();
    echo json_encode($p);

} elseif ($method === 'POST' && !$id) {
    $user = requireAuth();
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($ct, 'multipart/form-data') || str_contains($ct, 'application/x-www-form-urlencoded')) {
        $b = $_POST;
        $b['divisiones'] = json_decode($b['divisiones'] ?? '[]', true) ?: [];
    } else {
        $b = json_decode(file_get_contents('php://input'), true) ?? [];
    }
    // Bloquear creación de productos en depósitos
    $tid = (int)($b['tienda_id'] ?? $user['tienda_id']);
    $tipoCheck = $db->prepare("SELECT tipo FROM tiendas WHERE id=?");
    $tipoCheck->execute([$tid]);
    $tipoRow = $tipoCheck->fetch();
    if ($tipoRow && $tipoRow['tipo'] === 'deposito') {
        http_response_code(400);
        echo json_encode(['error' => 'Los depósitos no tienen productos propios. Los productos se gestionan en la tienda (sucursal).']);
        exit;
    }
    $fotoUrl = null;
    if (!empty($_FILES['foto']['tmp_name'])) {
        $dir = __DIR__ . '/../uploads/';
        if (!is_dir($dir)) mkdir($dir, 0777, true);
        $ext = strtolower(pathinfo($_FILES['foto']['name'], PATHINFO_EXTENSION));
        $fname = uniqid('prod_') . '.' . $ext;
        move_uploaded_file($_FILES['foto']['tmp_name'], $dir . $fname);
        $fotoUrl = '/backend/uploads/' . $fname;
    }
    $stmt = $db->prepare("INSERT INTO productos (codigo,nombre,descripcion,categoria_id,unidad,precio_compra,precio_mayor,precio_facturado,precio_sin_factura,stock,stock_minimo,permite_dividir,cantidad_divisible,tienda_id,foto,visible_tienda) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    $stmt->execute([$b['codigo']??null,$b['nombre'],$b['descripcion']??null,$b['categoria_id']??null,$b['unidad']??'Unidad',$b['precio_compra']??0,$b['precio_mayor']??0,$b['precio_facturado']??0,$b['precio_sin_factura']??0,$b['stock']??0,$b['stock_minimo']??0,$b['permite_dividir']??0,$b['cantidad_divisible']??0,$b['tienda_id']??$user['tienda_id'],$fotoUrl,isset($b['visible_tienda']) ? (int)$b['visible_tienda'] : 1]);
    $pid = $db->lastInsertId();
    foreach (($b['divisiones'] ?? []) as $div) {
        $db->prepare("INSERT INTO producto_divisiones (producto_id,nombre,cantidad,precio_compra,precio_mayor,precio_sin_factura,precio_facturado) VALUES (?,?,?,?,?,?,?)")
           ->execute([$pid,$div['nombre'],$div['cantidad'],$div['precio_compra']??0,$div['precio_mayor']??0,$div['precio_sin_factura']??0,$div['precio_facturado']??0]);
    }

    // Si el producto se creó en Boxer (tienda principal), copiarlo con stock=0 a todas las demás sucursales
    $boxerRow  = $db->query("SELECT MIN(id) as id FROM tiendas WHERE tipo='sucursal' AND activa=1")->fetch();
    $boxerId   = $boxerRow['id'] ?? 1;
    $tiendaId  = (int)($b['tienda_id'] ?? $user['tienda_id']);
    if ($tiendaId === (int)$boxerId) {
        $otras = $db->prepare("SELECT id FROM tiendas WHERE tipo='sucursal' AND activa=1 AND id != ?");
        $otras->execute([$boxerId]);
        $copiaStmt = $db->prepare(
            "INSERT INTO productos (codigo,nombre,descripcion,categoria_id,unidad,precio_compra,precio_mayor,precio_facturado,precio_sin_factura,stock,stock_minimo,permite_dividir,cantidad_divisible,tienda_id,foto,visible_tienda)
             VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?)"
        );
        foreach ($otras->fetchAll() as $t) {
            $copiaStmt->execute([
                $b['codigo']??null, $b['nombre'], $b['descripcion']??null, $b['categoria_id']??null,
                $b['unidad']??'Unidad', $b['precio_compra']??0, $b['precio_mayor']??0,
                $b['precio_facturado']??0, $b['precio_sin_factura']??0,
                $b['stock_minimo']??0, $b['permite_dividir']??0, $b['cantidad_divisible']??0,
                $t['id'], $fotoUrl, isset($b['visible_tienda']) ? (int)$b['visible_tienda'] : 1,
            ]);
            $copiaId = $db->lastInsertId();
            foreach (($b['divisiones'] ?? []) as $div) {
                $db->prepare("INSERT INTO producto_divisiones (producto_id,nombre,cantidad,precio_compra,precio_mayor,precio_sin_factura,precio_facturado) VALUES (?,?,?,?,?,?,?)")
                   ->execute([$copiaId,$div['nombre'],$div['cantidad'],$div['precio_compra']??0,$div['precio_mayor']??0,$div['precio_sin_factura']??0,$div['precio_facturado']??0]);
            }
        }
    }

    echo json_encode(['id' => $pid, 'ok' => true]);

} elseif ($method === 'POST' && ($_GET['action'] ?? '') === 'ajuste_precio') {
    requireAuth();
    $b       = json_decode(file_get_contents('php://input'), true) ?? [];
    $tienda  = (int)($b['tienda_id'] ?? 0);
    $campo   = $b['campo'] ?? '';   // precio_mayor | precio_compra | precio_facturado | precio_sin_factura | todos
    $tipo    = $b['tipo']  ?? '';   // incremento | reduccion
    $modo    = $b['modo']  ?? '%';  // % | fijo
    $valor   = abs((float)($b['valor'] ?? 0));

    $campos_validos = ['precio_mayor','precio_compra','precio_facturado','precio_sin_factura'];
    if ($campo === 'todos') $campos = $campos_validos;
    elseif (in_array($campo, $campos_validos)) $campos = [$campo];
    else { http_response_code(400); echo json_encode(['error'=>'Campo inválido']); exit; }

    if (!in_array($tipo, ['incremento','reduccion'])) { http_response_code(400); echo json_encode(['error'=>'Tipo inválido']); exit; }
    if (!$tienda) { http_response_code(400); echo json_encode(['error'=>'tienda_id requerido']); exit; }

    $prods = $db->prepare("SELECT id, precio_mayor, precio_compra, precio_facturado, precio_sin_factura FROM productos WHERE tienda_id=? AND activo=1");
    $prods->execute([$tienda]);
    $rows = $prods->fetchAll();

    $actualizados = 0;
    foreach ($rows as $p) {
        $sets = [];
        $params = [];
        foreach ($campos as $c) {
            $old = (float)$p[$c];
            if ($modo === '%') {
                $new = $tipo === 'incremento' ? $old * (1 + $valor/100) : $old * (1 - $valor/100);
            } else {
                $new = $tipo === 'incremento' ? $old + $valor : max(0, $old - $valor);
            }
            $sets[]   = "$c=?";
            $params[] = round($new, 2);
        }
        $params[] = $p['id'];
        $db->prepare("UPDATE productos SET " . implode(',', $sets) . " WHERE id=?")->execute($params);
        $actualizados++;
    }
    echo json_encode(['ok'=>true, 'actualizados'=>$actualizados]);

} elseif ($method === 'DELETE' && $id) {
    requireAuth();
    $db->prepare("UPDATE productos SET activo = 0 WHERE id = ?")->execute([$id]);

    // Apagar también las copias del mismo producto en las demás sucursales (mismo codigo)
    $cod = $db->prepare("SELECT codigo FROM productos WHERE id = ?");
    $cod->execute([$id]);
    $codigo = $cod->fetchColumn();
    if (!empty($codigo)) {
        $db->prepare("UPDATE productos SET activo = 0 WHERE codigo = ? AND id != ?")->execute([$codigo, $id]);
    }

    echo json_encode(['ok' => true]);
} else {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']);
}
