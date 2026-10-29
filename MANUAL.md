# Box Sistema — Manual de Usuario
**Comercial Boxer** · Sistema de gestión comercial

---

## Acceso al sistema

- **URL local**: `http://localhost:3002`
- **Usuarios de prueba** (contraseña: `password`):
  - `admin` → Administrador (acceso total)
  - `vendedor1` → Vendedor Sucursal 1
  - `vendedor2` → Vendedor Sucursal 1
  - `vendedor3` → Vendedor Sucursal 2

---

## Roles y permisos

| Módulo | Admin | Gerente | Vendedor |
|--------|-------|---------|---------|
| Dashboard | ✅ | ✅ | ✅ |
| Ventas | ✅ | ✅ | ✅ |
| Compras | ✅ | ✅ | ✅ |
| Productos | ✅ | ✅ | Solo ver |
| Clientes | ✅ | ✅ | ✅ |
| Proveedores | ✅ | ✅ | ❌ |
| Cuentas por pagar | ✅ | ✅ | ❌ |
| Préstamos (fiado) | ✅ | ✅ | ✅ |
| Préstamo dinero | ✅ | ✅ | ❌ |
| Pedidos | ✅ | ✅ | ❌ |
| Cambios | ✅ | ✅ | ✅ |
| Caja | ✅ | ✅ | ✅ |
| Movimientos inventario | ✅ | ✅ | ❌ |
| Tarjetas/Recargas | ✅ | ✅ | ✅ |
| Asistencia | ✅ | ✅ | ❌ |
| Reportes | ✅ | ✅ | ❌ |
| Configuración | ✅ | Solo ver | ❌ |

---

## Dashboard

Pantalla principal. Muestra:
- **Reloj en tiempo real** de Bolivia (UTC-4)
- **Ventas del día**: total + número de transacciones
- **Compras del día**: total acumulado
- **Fiado pendiente**: saldo total de clientes con deuda
- **Bajo stock**: cantidad de productos por debajo del mínimo
- **Ingresos/Egresos del día**: flujo de caja
- **Accesos rápidos**: botones directos a módulos frecuentes

---

## Ventas

### Lista de ventas (`/ventas`)
- Ver todas las ventas del día (filtrar por rango de fechas)
- Ver detalle de cada venta haciendo click
- Anular una venta (solo admin/gerente)
- Botón **"Nueva Venta"** arriba a la derecha

### Nueva Venta (`/ventas/nueva`)
**2 terminales simultáneas** — cada una guarda su carrito independientemente:
1. Seleccionar **Terminal 1** o **Terminal 2** (arriba a la derecha del header)
2. **Buscar producto**: escribir nombre en el buscador (mínimo 2 letras)
3. Click en el producto para agregarlo al carrito
4. **Ajustar cantidad**: botones `+` y `−`, o editar directamente
5. **Cambiar precio**: campo editable en la fila del producto
6. **Seleccionar cliente** (opcional, obligatorio para fiado)
7. **Forma de pago**: efectivo / qr / tarjeta / fiado / mixto
8. **Descuento**: ingresar porcentaje (ej: `10` = 10% de descuento)
9. Si es efectivo: ingresar monto recibido → el sistema calcula el vuelto automáticamente
10. Click **"Confirmar Venta"**

> El carrito de cada terminal se guarda automáticamente. Si cierras el navegador y vuelves, el carrito sigue ahí.

---

## Compras

### Lista de compras (`/compras`)
- Ver todas las compras registradas
- Filtrar por proveedor o fecha

### Nueva Compra (`/compras/nueva`)
1. Seleccionar proveedor
2. Agregar productos con cantidad y precio de compra
3. Seleccionar forma de pago: **efectivo / qr / tarjeta / crédito**
   - Si es **crédito**: la deuda se puede registrar en Cuentas por Pagar
4. Confirmar compra → actualiza stock automáticamente

---

## Productos

### Lista (`/productos`)
- Ver todos los productos con stock actual
- Filtrar por categoría o buscar por nombre
- Productos con stock bajo resaltados en rojo
- Botones: **Editar**, **Eliminar**, **Ajustar stock**

### Agregar / Editar producto
1. Click **"Nuevo producto"** (o ícono de lápiz para editar)
2. Completar los campos del formulario:
   - **Código**: código interno del producto (ej: MAT001)
   - **Categoría**: seleccionar de la lista *(ver más abajo cómo crear una nueva directamente aquí)*
   - **Unidad**: seleccionar de la lista *(ver más abajo cómo crear una nueva directamente aquí)*
   - **Nombre** y **Descripción**
   - **P. Compra**: precio al que lo compras al proveedor
   - **P. por Mayor**: precio especial para compras al por mayor
   - **P. sin Factura / P. con Factura**: precios de venta al público
   - **Stock mínimo**: a partir de cuántas unidades aparece la alerta de bajo stock
   - **Stock actual**: cantidad en existencia
3. Click **"Guardar"**

#### Crear categoría directamente en el formulario
No es necesario salir al módulo de Configuración. En el campo **Categoría**:
1. Debajo del selector de categoría hay un campo de texto
2. Escribir el nombre de la nueva categoría (ej: *Herramientas Eléctricas*)
3. Click **"+ Crear"** (o presionar Enter)
4. La categoría se crea al instante y queda seleccionada automáticamente

> También puedes crear categorías en **Configuración → Categorías** para tenerlas listas antes de agregar productos.

#### Crear unidad directamente en el formulario
En el campo **Unidad**:
1. Si la unidad que necesitas está en la lista (Unidad, Kg, Bolsa, Saco, etc.) → selecciónala
2. Si no está → selecciona **"Otra..."** en la lista, O simplemente escribe la unidad personalizada en el campo de texto debajo del selector (ej: *Quintal 46kg*, *Saco 50kg*, *Plancha 1.2mm*)
3. La unidad personalizada se guarda directamente en el producto

### Importar desde Excel
- Botón **"Importar"** → subir archivo .xlsx con columnas: nombre, precio_compra, precio_venta, stock, categoria
- Los productos existentes se actualizan, los nuevos se crean

---

## Clientes

- Ver lista de clientes con saldo de fiado pendiente
- **Agregar cliente**: nombre, teléfono, dirección
- Ver historial de compras de cada cliente
- Los clientes con saldo pendiente aparecen destacados

---

## Proveedores

### Lista proveedores (`/proveedores`)
- Ver todos los proveedores
- Agregar, editar, eliminar

### Cuentas por Pagar (`/cuentas-pagar`)
Registra las deudas que la tienda tiene con proveedores:
1. Click **"Nueva deuda"**
2. Seleccionar proveedor, concepto, monto total, fecha y fecha de vencimiento (opcional)
3. La deuda aparece en la lista como **Pendiente**
4. Para registrar un pago: click **"Pagar"** en la fila
   - Ingresar monto a pagar (puede ser parcial)
   - Seleccionar forma de pago: efectivo / qr / tarjeta / transferencia
5. Si el pago es parcial → estado cambia a **Parcial**
6. Si se paga todo → estado cambia a **Pagado**

> Las deudas vencidas se resaltan en rojo con ícono de alerta ⚠️

---

## Préstamos

### Fiado / Clientes (`/prestamos`)
Cuando una venta se hace "fiado", queda registrada aquí:
- Ver todos los fiados pendientes
- Filtrar por cliente
- **Registrar pago**: click en el fiado → ingresar monto pagado
- El saldo se descuenta automáticamente

### Préstamo de dinero (`/prestamos/dinero`)
Para registrar préstamos de efectivo (no de productos):
- **Tipo**: "Dinero prestado" (le prestaste a alguien) o "Dinero recibido" (alguien te prestó)
- Persona, monto, fecha límite
- Registrar pagos parciales o totales

---

## Pedidos (`/pedidos`)

Para registrar pedidos a proveedores antes de recibirlos:
1. Click **"Nuevo pedido"**
2. Seleccionar proveedor, productos a pedir con cantidades estimadas
3. Estado inicial: **Pendiente**
4. Cuando llega la mercancía: click **"Recibir"** → ingresar cantidades reales recibidas → actualiza stock

---

## Cambios (`/cambios`)

Para registrar cambios o devoluciones de productos:
1. Click **"Nuevo cambio"**
2. Seleccionar cliente y venta original (opcional)
3. **Productos devueltos**: lo que el cliente trae de vuelta
4. **Productos nuevos**: lo que el cliente lleva en reemplazo
5. El sistema calcula automáticamente la diferencia de precio
6. Si diferencia > 0: el cliente paga la diferencia
7. Si diferencia < 0: se le devuelve dinero al cliente

---

## Caja (`/caja`)

### Abrir caja
1. Click **"Abrir Caja"**
2. Ingresar monto de apertura (el dinero con que se empieza el día)

### Registrar movimientos
- **Registrar Ingreso**: dinero que entra (que no sea una venta, ej: abono extra)
- **Registrar Egreso**: dinero que sale (gastos, pagos a proveedores, etc.)
- Cada movimiento tiene: concepto, monto, forma de pago, depósito (opcional)

### Cerrar caja
1. Click **"Cerrar Caja"**
2. Ver resumen: apertura, ventas, compras, saldo calculado
3. Ingresar **"Retiro de billetes"**: el monto que se lleva el encargado
4. El saldo restante (monedas) queda en la caja física
5. Confirmar cierre

### Movimientos (`/movimientos`)
- Historial completo de entradas/salidas de inventario
- Filtrar por tipo: entrada / salida / ajuste / traslado
- Cada venta y compra genera movimientos automáticamente

---

## Tarjetas / Recargas (`/tarjetas`)

Para vender recargas y tarjetas directamente:
1. Click **"Nueva"**
2. Tipo: **recarga móvil / recarga internet / tarjeta regalo / bono / otro**
3. Operadora, número, monto y ganancia (tu ganancia sobre el servicio)
4. El módulo muestra el total del día separado por tipo

---

## Reportes (`/reportes`)

Disponible para admin y gerente. 5 pestañas:

### Resumen
- Total ventas, compras, fiado pendiente, flujo neto del período
- Alerta si hay productos con stock bajo

### Ventas por día
- Tabla con ventas diarias: número de transacciones, total, promedio

### Top productos
- Los productos más vendidos en el período (cantidad + monto)

### Stock
- Inventario completo con estado (OK / Stock bajo / Sin stock)
- Valor total del inventario

### Préstamos
- Resumen de fiado pendiente, cobrado y préstamos de dinero

### Exportar
- **Excel**: botón "Excel" descarga el reporte activo como .csv (abre en Excel)
- **PDF**: botón "PDF" abre ventana de impresión del reporte activo

---

## Asistencia (`/asistencia`)

Para registrar la asistencia del personal diariamente:
1. Seleccionar fecha (por defecto hoy)
2. Por cada empleado, click en el estado:
   - ✅ **Presente** — registra la hora actual automáticamente
   - ❌ **Ausente**
   - 🕐 **Tardanza**
   - 📋 **Permiso**
   - 🎉 **Feriado**
3. La hora de entrada se registra automáticamente al marcar

---

## Configuración (`/configuracion`)

Solo accesible para admin (y ver para gerente). Pestañas:

### Tiendas (Sucursales)
- Ver y editar información de Sucursal 1 y Sucursal 2
- El admin puede cambiar de sucursal activa desde el selector en el sidebar

### Usuarios
- Agregar usuarios: nombre, usuario, contraseña, rol (admin/gerente/vendedor), sucursal
- **Horario laboral**: definir hora de inicio y fin → si el vendedor intenta entrar fuera de ese horario, el sistema lo bloquea
- **Bloquear manualmente**: toggle para impedir el acceso inmediatamente
- Editar y eliminar usuarios

### Depósitos
- Registrar cuentas bancarias o cajas físicas
- Ejemplo: "Banco Unión", "Caja Chica Tienda 2"
- Se usan para asignar los movimientos de caja a un depósito específico

### Empleados
- Lista del personal (distinto a los usuarios del sistema)
- Agregar: nombre, cargo, teléfono, salario, sucursal
- Son los empleados que aparecen en el módulo de Asistencia

### Registro de cambios
- Historial de todas las modificaciones del sistema (quién cambió qué y cuándo)

### Todas las ventas / compras / recargas
- Vista global sin filtro de sucursal (solo admin)

---

## Cambio de sucursal

El administrador puede cambiar entre **Sucursal 1** y **Sucursal 2** desde el selector en la parte superior del sidebar. Al cambiar aparece un loader con el mensaje "Entrando a Sucursal X" mientras se cargan los datos.

---

## Preguntas frecuentes

**¿Cómo cambio la contraseña de un usuario?**
Ir a Configuración → Usuarios → Editar usuario → campo contraseña (dejar vacío para no cambiar).

**¿Cómo agrego una categoría nueva?**
Ir a Productos → al crear/editar un producto, las categorías se gestionan desde Configuración si el módulo está disponible, o directamente en la BD.

**¿Puedo anular una venta?**
Sí, desde la lista de ventas → detalle de venta → botón Anular (solo admin/gerente).

**¿Qué pasa si el stock llega a 0?**
El producto aparece con estado "Sin stock" en Reportes → Stock y con alerta roja en el Dashboard.

**¿Las dos sucursales comparten inventario?**
No. Cada sucursal tiene su propio inventario, caja, ventas y empleados. Solo el admin ve ambas.
