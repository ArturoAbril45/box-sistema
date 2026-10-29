CREATE DATABASE IF NOT EXISTS box_sistema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE box_sistema;

-- TIENDAS
CREATE TABLE tiendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo ENUM('sucursal','deposito') NOT NULL DEFAULT 'sucursal',
  direccion VARCHAR(200),
  telefono VARCHAR(30),
  activa TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USUARIOS
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin','gerente','vendedor') DEFAULT 'vendedor',
  tienda_id INT,
  activo TINYINT DEFAULT 1,
  token VARCHAR(64) NULL,
  horario_inicio TIME NULL,
  horario_fin TIME NULL,
  bloqueado TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- CATEGORIAS
CREATE TABLE categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tienda_id INT,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- UNIDADES
CREATE TABLE unidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tienda_id INT,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- PRODUCTOS
CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  categoria_id INT,
  unidad VARCHAR(30) DEFAULT 'Unidad',
  precio_compra DECIMAL(12,2) DEFAULT 0,
  precio_mayor DECIMAL(12,2) DEFAULT 0,
  precio_facturado DECIMAL(12,2) DEFAULT 0,
  precio_sin_factura DECIMAL(12,2) DEFAULT 0,
  stock DECIMAL(12,3) DEFAULT 0,
  stock_minimo DECIMAL(12,3) DEFAULT 0,
  stock_maximo DECIMAL(12,3) DEFAULT 0,
  permite_dividir TINYINT DEFAULT 0,
  cantidad_divisible DECIMAL(10,3) NOT NULL DEFAULT 0,
  stock_fraccion_actual DECIMAL(12,3) NOT NULL DEFAULT 0,
  tienda_id INT,
  activo TINYINT DEFAULT 1,
  visible_tienda TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  foto VARCHAR(255),
  FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- DIVISIONES DE PRODUCTO (ej: saco 50kg → vender por kg)
CREATE TABLE producto_divisiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  cantidad DECIMAL(12,3) NOT NULL,
  precio_compra DECIMAL(12,2) DEFAULT 0,
  precio_mayor DECIMAL(12,2) DEFAULT 0,
  precio_sin_factura DECIMAL(12,2) DEFAULT 0,
  precio_facturado DECIMAL(12,2) DEFAULT 0,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- CLIENTES
CREATE TABLE clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(30),
  direccion VARCHAR(200),
  tipo ENUM('ventas','compras','ambos') DEFAULT 'ventas',
  saldo_pendiente DECIMAL(12,2) DEFAULT 0,
  tienda_id INT,
  activo TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- PROVEEDORES
CREATE TABLE proveedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  celular VARCHAR(30),
  correo VARCHAR(100),
  dni VARCHAR(30),
  ciudad VARCHAR(100),
  origen VARCHAR(100),
  tienda_id INT,
  activo TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- DEPÓSITOS (cuentas bancarias/cajas)
CREATE TABLE depositos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  banco VARCHAR(100),
  numero_cuenta VARCHAR(100),
  saldo DECIMAL(12,2) DEFAULT 0,
  tienda_id INT,
  activo TINYINT DEFAULT 1,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- CAJAS
CREATE TABLE cajas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tienda_id INT NOT NULL,
  usuario_id INT,
  fecha DATE NOT NULL,
  monto_apertura DECIMAL(12,2) DEFAULT 0,
  monto_cierre DECIMAL(12,2) DEFAULT 0,
  total_ventas DECIMAL(12,2) DEFAULT 0,
  total_compras DECIMAL(12,2) DEFAULT 0,
  total_ingresos DECIMAL(12,2) DEFAULT 0,
  total_egresos DECIMAL(12,2) DEFAULT 0,
  estado ENUM('abierta','cerrada') DEFAULT 'abierta',
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- VENTAS
CREATE TABLE ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20),
  cliente_id INT,
  usuario_id INT NOT NULL,
  tienda_id INT NOT NULL,
  caja_id INT,
  subtotal DECIMAL(12,2) DEFAULT 0,
  descuento DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  pagado DECIMAL(12,2) DEFAULT 0,
  saldo DECIMAL(12,2) DEFAULT 0,
  forma_pago ENUM('efectivo','qr','tarjeta','fiado','mixto') DEFAULT 'efectivo',
  estado ENUM('pendiente','pagada','fiado','anulada') DEFAULT 'pendiente',
  notas TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id),
  FOREIGN KEY (caja_id) REFERENCES cajas(id)
);

-- ITEMS DE VENTA
CREATE TABLE venta_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  producto_id INT,
  nombre_producto VARCHAR(200),
  cantidad DECIMAL(12,3) NOT NULL,
  unidad VARCHAR(30),
  precio_unitario DECIMAL(12,2) NOT NULL,
  descuento DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- COMPRAS
CREATE TABLE compras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20),
  proveedor_id INT,
  usuario_id INT NOT NULL,
  tienda_id INT NOT NULL,
  caja_id INT,
  total DECIMAL(12,2) DEFAULT 0,
  pagado DECIMAL(12,2) DEFAULT 0,
  saldo DECIMAL(12,2) DEFAULT 0,
  forma_pago ENUM('efectivo','qr','tarjeta','credito') DEFAULT 'efectivo',
  estado ENUM('pendiente','pagada','anulada') DEFAULT 'pendiente',
  notas TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id),
  FOREIGN KEY (caja_id) REFERENCES cajas(id)
);

-- ITEMS DE COMPRA
CREATE TABLE compra_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  compra_id INT NOT NULL,
  producto_id INT,
  nombre_producto VARCHAR(200),
  cantidad DECIMAL(12,3) NOT NULL,
  unidad VARCHAR(30),
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- DISTRIBUCION DE UN ITEM DE COMPRA ENTRE SUCURSALES/ALMACENES
-- (ej: comprás 10 rollos, 2 van a Boxer, 8 a Deposito 1)
CREATE TABLE compra_item_distribucion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  compra_item_id INT NOT NULL,
  tienda_id INT NOT NULL,
  cantidad DECIMAL(12,3) NOT NULL,
  producto_id_destino INT,
  FOREIGN KEY (compra_item_id) REFERENCES compra_items(id) ON DELETE CASCADE,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- MOVIMIENTOS DE INVENTARIO
CREATE TABLE movimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('entrada','salida','ajuste','traslado') NOT NULL,
  producto_id INT NOT NULL,
  cantidad DECIMAL(12,3) NOT NULL,
  cantidad_anterior DECIMAL(12,3),
  cantidad_nueva DECIMAL(12,3),
  motivo VARCHAR(200),
  referencia_id INT,
  referencia_tipo VARCHAR(50),
  usuario_id INT,
  tienda_id INT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- PRÉSTAMOS DE PRODUCTOS (fiado)
CREATE TABLE prestamos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20),
  cliente_id INT NOT NULL,
  venta_id INT,
  tienda_id INT NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  pagado DECIMAL(12,2) DEFAULT 0,
  saldo DECIMAL(12,2) NOT NULL,
  estado ENUM('pendiente','parcial','pagado','anulado') DEFAULT 'pendiente',
  fecha DATE NOT NULL,
  fecha_limite DATE,
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- PAGOS DE PRÉSTAMOS DE PRODUCTOS
CREATE TABLE prestamo_pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prestamo_id INT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  forma_pago ENUM('efectivo','qr','tarjeta') DEFAULT 'efectivo',
  usuario_id INT,
  caja_id INT,
  notas TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prestamo_id) REFERENCES prestamos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- PRÉSTAMOS DE DINERO
CREATE TABLE prestamos_dinero (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('prestado','recibido') NOT NULL,
  persona VARCHAR(150) NOT NULL,
  concepto VARCHAR(200),
  monto DECIMAL(12,2) NOT NULL,
  pagado DECIMAL(12,2) DEFAULT 0,
  saldo DECIMAL(12,2) NOT NULL,
  estado ENUM('pendiente','parcial','pagado','anulado') DEFAULT 'pendiente',
  tienda_id INT,
  usuario_id INT,
  fecha DATE NOT NULL,
  fecha_limite DATE,
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- PAGOS DE PRÉSTAMOS DE DINERO
CREATE TABLE prestamos_dinero_pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prestamo_dinero_id INT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  forma_pago ENUM('efectivo','qr','tarjeta') DEFAULT 'efectivo',
  usuario_id INT,
  caja_id INT,
  notas TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prestamo_dinero_id) REFERENCES prestamos_dinero(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- INGRESOS Y EGRESOS DE CAJA
CREATE TABLE ingresos_egresos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('ingreso','egreso') NOT NULL,
  concepto VARCHAR(200) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  forma_pago ENUM('efectivo','qr','tarjeta') DEFAULT 'efectivo',
  deposito_id INT,
  caja_id INT,
  usuario_id INT,
  tienda_id INT NOT NULL,
  notas TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deposito_id) REFERENCES depositos(id),
  FOREIGN KEY (caja_id) REFERENCES cajas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- PEDIDOS A PROVEEDORES
CREATE TABLE pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20),
  proveedor_id INT,
  tienda_id INT NOT NULL,
  estado ENUM('pendiente','recibido_parcial','recibido','anulado') DEFAULT 'pendiente',
  total_estimado DECIMAL(12,2) DEFAULT 0,
  notas TEXT,
  fecha_pedido DATE NOT NULL,
  fecha_estimada DATE,
  fecha_recepcion DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- ITEMS DE PEDIDO
CREATE TABLE pedido_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT,
  nombre_producto VARCHAR(200),
  cantidad DECIMAL(12,3) NOT NULL,
  cantidad_recibida DECIMAL(12,3) DEFAULT 0,
  precio_estimado DECIMAL(12,2) DEFAULT 0,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- CAMBIOS (devolución y cambio de producto)
CREATE TABLE cambios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20),
  venta_id INT,
  cliente_id INT,
  tienda_id INT NOT NULL,
  motivo VARCHAR(200),
  total_devuelto DECIMAL(12,2) DEFAULT 0,
  total_nuevo DECIMAL(12,2) DEFAULT 0,
  diferencia DECIMAL(12,2) DEFAULT 0,
  estado ENUM('pendiente','completado','anulado') DEFAULT 'completado',
  usuario_id INT,
  notas TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE cambio_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cambio_id INT NOT NULL,
  tipo ENUM('devuelto','nuevo') NOT NULL,
  producto_id INT,
  nombre_producto VARCHAR(200),
  cantidad DECIMAL(12,3) NOT NULL,
  precio DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (cambio_id) REFERENCES cambios(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- TARJETAS Y RECARGAS
CREATE TABLE tarjetas_recargas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('recarga','tarjeta_regalo','cupon') DEFAULT 'recarga',
  operadora VARCHAR(100),
  numero VARCHAR(50),
  monto DECIMAL(12,2) NOT NULL,
  ganancia DECIMAL(12,2) DEFAULT 0,
  cliente_id INT,
  usuario_id INT,
  tienda_id INT,
  caja_id INT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- EMPLEADOS / PERSONAL
CREATE TABLE empleados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cargo VARCHAR(100),
  telefono VARCHAR(30),
  salario DECIMAL(12,2) DEFAULT 0,
  tienda_id INT,
  activo TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- ASISTENCIA DE PERSONAL
CREATE TABLE asistencia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empleado_id INT NOT NULL,
  tienda_id INT,
  fecha DATE NOT NULL,
  estado ENUM('presente','ausente','tardanza','permiso','feriado') DEFAULT 'presente',
  hora_entrada TIME,
  hora_salida TIME,
  notas VARCHAR(200),
  FOREIGN KEY (empleado_id) REFERENCES empleados(id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
);

-- CUENTAS POR PAGAR (deudas a proveedores)
CREATE TABLE cuentas_por_pagar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id INT NOT NULL,
  compra_id INT NULL,
  tienda_id INT NOT NULL,
  concepto VARCHAR(200) NOT NULL,
  monto_total DECIMAL(12,2) NOT NULL,
  monto_pagado DECIMAL(12,2) DEFAULT 0,
  saldo DECIMAL(12,2) NOT NULL,
  estado ENUM('pendiente','parcial','pagado') DEFAULT 'pendiente',
  fecha DATE NOT NULL,
  fecha_vencimiento DATE NULL,
  notas TEXT,
  usuario_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE cuentas_pagar_pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cuenta_id INT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  forma_pago ENUM('efectivo','qr','tarjeta','transferencia') DEFAULT 'efectivo',
  usuario_id INT,
  notas TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cuenta_id) REFERENCES cuentas_por_pagar(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- CONFIGURACIÓN
CREATE TABLE configuracion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(100) NOT NULL,
  valor TEXT,
  tienda_id INT,
  UNIQUE KEY unique_config (clave, tienda_id)
);

-- REGISTRO DE CAMBIOS DEL SISTEMA
CREATE TABLE registro_cambios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tabla VARCHAR(100),
  accion VARCHAR(50),
  registro_id INT,
  datos_anteriores JSON,
  datos_nuevos JSON,
  usuario_id INT,
  tienda_id INT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- DATOS INICIALES
INSERT INTO tiendas (nombre, direccion) VALUES
  ('Tienda Principal', 'Dirección principal'),
  ('Tienda 2', 'Dirección sucursal');

INSERT INTO usuarios (nombre, username, password, rol, tienda_id) VALUES
  ('Administrador', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1),
  ('Vendedor 1', 'vendedor1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendedor', 1),
  ('Vendedor 2', 'vendedor2', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendedor', 1),
  ('Vendedor 3', 'vendedor3', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendedor', 2);

-- password para todos: "password"

INSERT INTO categorias (nombre, tienda_id) VALUES
  ('Cemento y Mortero', 1), ('Fierro y Metal', 1), ('Herramientas', 1),
  ('Pintura', 1), ('Madera', 1), ('Plomería', 1), ('Eléctrico', 1), ('Otros', 1);

INSERT INTO depositos (nombre, banco, tienda_id) VALUES
  ('Caja Chica Tienda 1', NULL, 1),
  ('Banco Unión Tienda 1', 'Banco Unión', 1),
  ('Caja Chica Tienda 2', NULL, 2);

INSERT INTO configuracion (clave, valor) VALUES
  ('nombre_empresa', 'Mi Comercial'),
  ('moneda', 'Bs.'),
  ('igv', '0'),
  ('ticket_pie', 'Gracias por su compra');

-- TRASPASOS DE PRODUCTOS ENTRE ALMACENES
CREATE TABLE traspasos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_nombre VARCHAR(200) NOT NULL,
  almacen_origen_id INT NOT NULL,
  almacen_destino_id INT NOT NULL,
  producto_origen_id INT NOT NULL,
  producto_destino_id INT NOT NULL,
  cantidad DECIMAL(12,3) NOT NULL,
  motivo VARCHAR(255) NULL,
  usuario_id INT,
  distribuidor_id INT NULL,
  lote_id VARCHAR(40) NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (almacen_origen_id) REFERENCES tiendas(id),
  FOREIGN KEY (almacen_destino_id) REFERENCES tiendas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (distribuidor_id) REFERENCES usuarios(id),
  INDEX idx_lote (lote_id)
);

-- MIGRACIÓN v2: catálogo global + tipo de tienda
-- Ejecutar si ya existe la base de datos:
-- ALTER TABLE tiendas ADD COLUMN tipo ENUM('sucursal','deposito') NOT NULL DEFAULT 'sucursal' AFTER nombre;
-- Los productos con tienda_id IS NULL son el catálogo global.
