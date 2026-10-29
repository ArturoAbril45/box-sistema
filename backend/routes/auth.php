<?php
$method = $_SERVER['REQUEST_METHOD'];
$parts  = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$action = $parts[array_search('auth', $parts) + 1] ?? '';

if ($method === 'POST' && $action === 'login') {
    $body = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("SELECT u.*, t.nombre as tienda_nombre FROM usuarios u LEFT JOIN tiendas t ON u.tienda_id = t.id WHERE u.username = ? AND u.activo = 1");
    $stmt->execute([$body['username'] ?? '']);
    $user = $stmt->fetch();

    if (!$user || !password_verify($body['password'] ?? '', $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Usuario o contraseña incorrectos']);
        exit;
    }

    // Verificar bloqueo manual
    if ($user['bloqueado']) {
        http_response_code(403);
        echo json_encode(['error' => 'Usuario bloqueado. Contacta al administrador.']);
        exit;
    }

    // Verificar horario laboral (solo si tiene horario configurado y no es admin)
    if ($user['rol'] !== 'admin' && $user['horario_inicio'] && $user['horario_fin']) {
        $ahora = date('H:i:s');
        if ($ahora < $user['horario_inicio'] || $ahora > $user['horario_fin']) {
            http_response_code(403);
            echo json_encode(['error' => "Acceso solo entre {$user['horario_inicio']} y {$user['horario_fin']}"]);
            exit;
        }
    }

    $token = bin2hex(random_bytes(32));
    $pdo->prepare("UPDATE usuarios SET token = ? WHERE id = ?")->execute([$token, $user['id']]);
    unset($user['password'], $user['token']);
    echo json_encode(['token' => $token, 'user' => $user]);

} elseif ($method === 'GET' && $action === 'me') {
    $user = requireAuth();
    unset($user['password'], $user['token']);
    echo json_encode($user);

} elseif ($method === 'POST' && $action === 'logout') {
    $user = requireAuth();
    $pdo->prepare("UPDATE usuarios SET token = NULL WHERE id = ?")->execute([$user['id']]);
    echo json_encode(['ok' => true]);

} else {
    http_response_code(404); echo json_encode(['error' => 'Not found']);
}
