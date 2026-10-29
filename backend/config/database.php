<?php
function getDB() {
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO(
        'mysql:host=localhost;dbname=comercialboxer_boxer;charset=utf8mb4',
        'comercialboxer_boxer', 'Boxer2026@!',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    return $pdo;
}
