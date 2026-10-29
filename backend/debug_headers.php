<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
echo json_encode([
    'HTTP_AUTHORIZATION' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'NO ESTÁ',
    'REDIRECT_HTTP_AUTHORIZATION' => $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 'NO ESTÁ',
    'getallheaders' => function_exists('getallheaders') ? getallheaders() : 'NO DISPONIBLE',
    'all_server_keys' => array_filter(array_keys($_SERVER), fn($k) => str_contains(strtolower($k), 'auth')),
]);
