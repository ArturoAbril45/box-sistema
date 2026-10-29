<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
echo json_encode([
    'HTTP_AUTHORIZATION' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'NO',
    'REDIRECT' => $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 'NO',
    'all_headers' => function_exists('getallheaders') ? getallheaders() : 'no func',
]);
