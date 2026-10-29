<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Token');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/auth.php';
$pdo = getDB();

$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts = explode('/', $path);
// Remove prefix if running inside subdir
while (count($parts) > 0 && $parts[0] !== 'api' && !in_array($parts[0], ['auth','tienda-publica','productos','catalogo','categorias','unidades','clientes','proveedores','ventas','compras','prestamos','prestamos-dinero','pedidos','cambios','caja','ingresos-egresos','tarjetas','movimientos','traspasos','depositos','tiendas','usuarios','empleados','asistencia','configuracion','reportes','registro-cambios','cuentas-pagar','debug-headers'])) {
    array_shift($parts);
}
$resource = $parts[0] ?? '';

switch ($resource) {
    case 'auth':               require __DIR__ . '/routes/auth.php'; break;
    case 'tienda-publica':     require __DIR__ . '/routes/tienda_publica.php'; break;
    case 'productos':          require __DIR__ . '/routes/productos.php'; break;
    case 'categorias':         require __DIR__ . '/routes/categorias.php'; break;
    case 'unidades':           require __DIR__ . '/routes/unidades.php'; break;
    case 'clientes':           require __DIR__ . '/routes/clientes.php'; break;
    case 'proveedores':        require __DIR__ . '/routes/proveedores.php'; break;
    case 'ventas':             require __DIR__ . '/routes/ventas.php'; break;
    case 'compras':            require __DIR__ . '/routes/compras.php'; break;
    case 'prestamos':          require __DIR__ . '/routes/prestamos.php'; break;
    case 'prestamos-dinero':   require __DIR__ . '/routes/prestamos_dinero.php'; break;
    case 'pedidos':            require __DIR__ . '/routes/pedidos.php'; break;
    case 'cambios':            require __DIR__ . '/routes/cambios.php'; break;
    case 'caja':               require __DIR__ . '/routes/caja.php'; break;
    case 'ingresos-egresos':   require __DIR__ . '/routes/ingresos_egresos.php'; break;
    case 'tarjetas':           require __DIR__ . '/routes/tarjetas.php'; break;
    case 'movimientos':        require __DIR__ . '/routes/movimientos.php'; break;
    case 'traspasos':          require __DIR__ . '/routes/traspasos.php'; break;
    case 'depositos':          require __DIR__ . '/routes/depositos.php'; break;
    case 'catalogo':           require __DIR__ . '/routes/catalogo.php'; break;
    case 'tiendas':            require __DIR__ . '/routes/tiendas.php'; break;
    case 'usuarios':           require __DIR__ . '/routes/usuarios.php'; break;
    case 'empleados':          require __DIR__ . '/routes/empleados.php'; break;
    case 'asistencia':         require __DIR__ . '/routes/asistencia.php'; break;
    case 'configuracion':      require __DIR__ . '/routes/configuracion.php'; break;
    case 'reportes':           require __DIR__ . '/routes/reportes.php'; break;
    case 'registro-cambios':   require __DIR__ . '/routes/registro_cambios.php'; break;
    case 'cuentas-pagar':      require __DIR__ . '/routes/cuentas_pagar.php'; break;
    case 'debug-headers':
        echo json_encode([
            'HTTP_AUTHORIZATION' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'NO',
            'REDIRECT_HTTP_AUTHORIZATION' => $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 'NO',
            'getallheaders' => function_exists('getallheaders') ? getallheaders() : 'NO_FUNC',
        ]); break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Ruta no encontrada']);
}
