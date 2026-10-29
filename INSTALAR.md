# Box Sistema — Instrucciones de instalación

## Requisitos
- XAMPP instalado (Apache + MySQL)
- Node.js 18+ instalado

---

## PASO 1 — Copiar backend a XAMPP

Copia la carpeta `backend` dentro de XAMPP:

```
C:\xampp\htdocs\box-sistema\backend\
```

La estructura debe quedar:
```
C:\xampp\htdocs\box-sistema\backend\index.php
C:\xampp\htdocs\box-sistema\backend\routes\
C:\xampp\htdocs\box-sistema\backend\config\
C:\xampp\htdocs\box-sistema\backend\middleware\
```

---

## PASO 2 — Crear la base de datos

1. Abre XAMPP → inicia Apache y MySQL
2. Abre tu navegador en: http://localhost/phpmyadmin
3. Crea una base de datos llamada: `box_sistema`
4. Selecciona esa base de datos → ve a la pestaña "SQL"
5. Copia y pega el contenido del archivo `backend\install\schema.sql`
6. Haz clic en "Continuar" para ejecutar

---

## PASO 3 — Configurar conexión a la base de datos

Abre el archivo:
```
C:\xampp\htdocs\box-sistema\backend\config\database.php
```

Verifica que los datos sean:
```php
$host = 'localhost';
$db   = 'box_sistema';
$user = 'root';
$pass = '';          // si tienes contraseña en MySQL, ponla aquí
```

---

## PASO 4 — Iniciar el frontend

Abre una terminal (CMD o PowerShell) en la carpeta del proyecto:

```bash
cd "C:\Users\artur\Desktop\box sistema\frontend"
npm install
npm run dev
```

Abre el navegador en: **http://localhost:5173**

---

## CREDENCIALES iniciales

| Usuario | Contraseña | Rol   |
|---------|------------|-------|
| admin   | password   | Admin |

---

## Estructura del sistema

| Módulo             | Ruta            |
|--------------------|-----------------|
| Dashboard          | /               |
| Ventas             | /ventas         |
| Nueva venta        | /ventas/nueva   |
| Compras            | /compras        |
| Productos          | /productos      |
| Clientes           | /clientes       |
| Proveedores        | /proveedores    |
| Préstamos (fiado)  | /prestamos      |
| Préstamos dinero   | /prestamos/dinero |
| Pedidos            | /pedidos        |
| Cambios            | /cambios        |
| Caja               | /caja           |
| Tarjetas/Recargas  | /tarjetas       |
| Movimientos        | /movimientos    |
| Reportes           | /reportes       |
| Configuración      | /configuracion  |
| Asistencia         | /asistencia     |
