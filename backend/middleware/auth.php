<?php
function getToken() {
    // X-Token header (no bloqueado por Apache)
    if (!empty($_SERVER['HTTP_X_TOKEN'])) return $_SERVER['HTTP_X_TOKEN'];
    // Fallback Authorization header
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) return str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']);
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return str_replace('Bearer ', '', $_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    if (function_exists('apache_request_headers')) {
        $h = apache_request_headers();
        if (!empty($h['X-Token'])) return $h['X-Token'];
        if (!empty($h['Authorization'])) return str_replace('Bearer ', '', $h['Authorization']);
    }
    return '';
}

function requireAuth() {
    $token = getToken();
    if (!$token) { http_response_code(401); echo json_encode(['error' => 'No autorizado']); exit; }
    $db = getDB();
    $stmt = $db->prepare("SELECT u.*, t.nombre as tienda_nombre FROM usuarios u LEFT JOIN tiendas t ON u.tienda_id = t.id WHERE u.token = ? AND u.activo = 1");
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if (!$user) { http_response_code(401); echo json_encode(['error' => 'Token inválido']); exit; }
    return $user;
}

function getAuthUser() {
    $token = getToken();
    if (!$token) return null;
    $db = getDB();
    $stmt = $db->prepare("SELECT u.*, t.nombre as tienda_nombre FROM usuarios u LEFT JOIN tiendas t ON u.tienda_id = t.id WHERE u.token = ? AND u.activo = 1");
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}
