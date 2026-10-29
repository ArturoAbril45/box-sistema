# Box Sistema

Sistema de gestion comercial para **Comercial Boxer**. Administra ventas, compras, inventario, clientes, proveedores, fiados, prestamos, caja, tarjetas/recargas, asistencia de personal y reportes, para una o varias sucursales (tiendas) con control de roles y permisos.

Este README es el documento principal del proyecto y amplia la informacion de `INSTALAR.md` (guia rapida de instalacion) y `MANUAL.md` (manual de uso funcional, modulo por modulo). Ambos archivos se conservan tal cual y siguen siendo utiles como referencia rapida; aqui se consolida y se completa la informacion tecnica.

## Indice

- [Descripcion del sistema](#descripcion-del-sistema)
- [Arquitectura y stack tecnologico](#arquitectura-y-stack-tecnologico)
- [Requisitos previos](#requisitos-previos)
- [Instalacion paso a paso](#instalacion-paso-a-paso)
  - [1. Backend (PHP + MySQL)](#1-backend-php--mysql)
  - [2. Frontend (React + Vite)](#2-frontend-react--vite)
- [Levantar el proyecto en desarrollo](#levantar-el-proyecto-en-desarrollo)
- [Despliegue / compilacion para produccion](#despliegue--compilacion-para-produccion)
- [Variables de entorno y configuracion](#variables-de-entorno-y-configuracion)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Modulos del sistema](#modulos-del-sistema)
- [Roles y permisos](#roles-y-permisos)
- [Credenciales de prueba](#credenciales-de-prueba)
- [Notas de seguridad importantes](#notas-de-seguridad-importantes)
- [Archivos de referencia adicionales](#archivos-de-referencia-adicionales)

---

## Descripcion del sistema

Box Sistema es una aplicacion web de punto de venta (POS) y gestion comercial a medida, compuesta por:

- Un **backend** en PHP puro (sin framework), que expone una API tipo REST consumida por el frontend, con conexion directa a MySQL mediante PDO.
- Un **frontend** en React (Vite), con Tailwind CSS para estilos, que consume esa API mediante `fetch`.

El sistema soporta multiples sucursales ("tiendas"), cada una con su propio inventario, caja, ventas y empleados. Solo el usuario administrador puede ver y alternar entre todas las sucursales; el resto de roles queda restringido a la suya.

Funcionalidades principales (ver detalle completo en `MANUAL.md`):

- Ventas con 2 terminales simultaneas (carritos independientes por terminal, persistidos en el navegador).
- Compras a proveedores con actualizacion automatica de stock.
- Catalogo de productos con categorias y unidades configurables al vuelo, e importacion masiva desde Excel.
- Clientes con saldo de fiado (credito) y su cobro.
- Proveedores y Cuentas por Pagar (deudas con pagos parciales).
- Prestamos de dinero (prestado/recibido) independientes del fiado de productos.
- Pedidos a proveedores (pendiente -> recibido, con actualizacion de stock).
- Cambios/devoluciones de productos con calculo automatico de diferencia de precio.
- Caja: apertura, ingresos/egresos, cierre con conteo de retiro de billetes.
- Movimientos de inventario (entrada/salida/ajuste/traslado) y traspasos entre sucursales/almacenes.
- Venta de tarjetas y recargas (moviles, internet, regalo, bonos).
- Reportes (resumen, ventas por dia, top productos, stock, prestamos) exportables a Excel (.csv) y PDF (impresion).
- Asistencia diaria del personal.
- Configuracion: sucursales, usuarios y roles, depositos/cuentas, empleados, registro de cambios (auditoria).

## Arquitectura y stack tecnologico

**Backend** (`backend/`):

- PHP 8.x puro, sin framework (no usa Composer ni Laravel; no hay `composer.json` ni carpeta `vendor/`).
- Enrutamiento manual en `index.php`: lee la URI, detecta el primer segmento del path como "recurso" y hace `require` del archivo correspondiente en `routes/`.
- Conexion a base de datos MySQL via PDO, definida en `config/database.php` (ver [Variables de entorno](#variables-de-entorno-y-configuracion)).
- Autenticacion propia basada en un token guardado en la tabla `usuarios` (columna `token`), enviado por el frontend en el header `X-Token` (o `Authorization: Bearer ...` como alternativa). Logica en `middleware/auth.php`.
- Pensado para ejecutarse sobre **Apache** (vía XAMPP) gracias al `.htaccess` incluido, que reescribe toda petición hacia `index.php` y reenvia el header `Authorization`.
- Carpeta `install/schema.sql` con el script completo de creacion de la base de datos y tablas.
- Carpeta `uploads/` con imagenes de productos subidas por el sistema.

**Frontend** (`frontend/`):

- React 18 + React Router 6.
- Vite 5 como bundler y servidor de desarrollo.
- Tailwind CSS 3 + PostCSS/Autoprefixer para estilos.
- `lucide-react` para iconos y `dayjs` para manejo de fechas (zona horaria Bolivia, UTC-4).
- Capa de acceso a datos centralizada en `src/lib/api.js` (todas las llamadas HTTP al backend).
- Autenticacion y permisos en `src/context/AuthContext.jsx`; carrito de ventas en `src/context/CartContext.jsx`.
- En desarrollo, Vite expone un proxy de `/backend` hacia el backend real (ver abajo), de modo que el frontend siempre llama a rutas relativas `/backend/...` sin necesidad de configurar una URL absoluta ni variables `VITE_*`.

No existen archivos `.env` en este proyecto: ni el backend ni el frontend leen variables de entorno; toda la configuracion (base de datos, puertos, proxy) esta escrita directamente en los archivos de configuracion correspondientes (ver seccion de variables de entorno).

## Requisitos previos

- **XAMPP** (o Apache + PHP + MySQL equivalentes) — incluye PHP 8.x y MySQL/MariaDB.
  - Alternativamente, para desarrollo rapido del backend sin Apache, puede usarse el servidor embebido de PHP (`php -S`), ver mas abajo.
- **Node.js 18+** y **npm** (para el frontend). Verificado con Node 24.x / npm 11.x en el entorno de referencia, pero cualquier Node >= 18 funciona.
- **Git** (para clonar/versionar el repositorio).
- Navegador moderno (Chrome, Edge, Firefox).

## Instalacion paso a paso

### 1. Backend (PHP + MySQL)

1. Copia (o clona) la carpeta `backend/` dentro del `htdocs` de XAMPP, de forma que quede:

   ```
   C:\xampp\htdocs\box-sistema\backend\index.php
   C:\xampp\htdocs\box-sistema\backend\routes\
   C:\xampp\htdocs\box-sistema\backend\config\
   C:\xampp\htdocs\box-sistema\backend\middleware\
   ```

2. Abre el **Panel de Control de XAMPP** e inicia los modulos **Apache** y **MySQL**.

3. Crea la base de datos:
   - Abre `http://localhost/phpmyadmin` en el navegador.
   - Crea una base de datos nueva (por ejemplo `box_sistema`).
   - Selecciona esa base de datos, ve a la pestaña **SQL**, pega el contenido completo de `backend/install/schema.sql` y ejecutalo ("Continuar"). Esto crea todas las tablas (`tiendas`, `usuarios`, `categorias`, `unidades`, `productos`, `ventas`, `compras`, etc.) con sus relaciones.

4. Configura la conexion a la base de datos editando `backend/config/database.php`. La funcion `getDB()` define el DSN, usuario y contraseña de MySQL:

   ```php
   $pdo = new PDO(
       'mysql:host=localhost;dbname=box_sistema;charset=utf8mb4',
       'root', '',   // usuario y password de tu MySQL local
       [...]
   );
   ```

   Ajusta `host`, `dbname`, usuario y password a tu entorno local (en XAMPP por defecto el usuario es `root` sin password).

5. Verifica que el backend responde abriendo, por ejemplo, `http://localhost/box-sistema/backend/debug-headers` en el navegador (debe devolver un JSON).

### 2. Frontend (React + Vite)

1. Abre una terminal (CMD, PowerShell o Git Bash) en la carpeta del proyecto:

   ```bash
   cd "C:\Users\artur\Desktop\box sistema\frontend"
   npm install
   ```

2. Revisa `vite.config.js`: el proxy `/backend` apunta por defecto a `http://localhost/box-sistema/backend` (es decir, asume que el backend corre bajo XAMPP en esa ruta). Si tu backend corre en otra ruta/puerto, ajusta el campo `target` de ese proxy.

3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. Abre el navegador en **http://localhost:3000** (puerto definido explicitamente en `vite.config.js`; es el puerto real usado por el proyecto, no el 5173 por defecto de Vite ni el 3002 mencionado en versiones antiguas de la documentacion).

## Levantar el proyecto en desarrollo

Se necesitan dos procesos corriendo en paralelo:

| Componente | Comando | Puerto / URL | Notas |
|---|---|---|---|
| MySQL | (servicio de XAMPP) | `localhost:3306` | Iniciar desde el Panel de XAMPP |
| Backend (recomendado) | Apache de XAMPP sirviendo `backend/` | `http://localhost/box-sistema/backend` | Requiere copiar `backend/` a `htdocs` (ver instalacion) |
| Backend (alternativa rapida) | `php -S localhost:8081 -t backend` ejecutado desde la raiz del proyecto | `http://localhost:8081` | Util para probar sin Apache; si se usa, actualizar el `target` del proxy en `vite.config.js` a `http://localhost:8081` |
| Frontend | `npm run dev` (dentro de `frontend/`) | `http://localhost:3000` | Vite con Hot Module Reload. El proxy interno reenvia `/backend/*` al backend |

Flujo tipico de arranque diario:

```bash
# Terminal 1: asegurar que Apache y MySQL de XAMPP estan iniciados (Panel de XAMPP)

# Terminal 2: frontend
cd "C:\Users\artur\Desktop\box sistema\frontend"
npm run dev
```

Luego entra a `http://localhost:3000` e inicia sesion con un usuario valido (ver [Credenciales de prueba](#credenciales-de-prueba)).

## Despliegue / compilacion para produccion

**Frontend:**

```bash
cd frontend
npm run build
```

Esto genera la carpeta `frontend/dist/` con los archivos estaticos listos para servir (HTML/CSS/JS minificados). Para previsualizar ese build localmente antes de desplegar:

```bash
npm run preview
```

Para produccion, sube el contenido de `frontend/dist/` al servidor web (por ejemplo, dentro del hosting/cPanel, en la carpeta publica del dominio o subdominio), y asegurate de que las peticiones a `/backend/*` (o la ruta que corresponda) lleguen al backend PHP real. Como el frontend llama a rutas relativas (`/backend/...`), lo mas simple en produccion es servir frontend y backend bajo el mismo dominio, con el backend accesible en la ruta `/backend`; si se publican en dominios distintos, hay que adaptar `src/lib/api.js` (constante `BASE`) y habilitar CORS (el backend ya envia `Access-Control-Allow-Origin: *` en `index.php`).

**Backend:**

No requiere "build": son archivos PHP que se sirven directamente. Para produccion:

1. Sube la carpeta `backend/` completa al servidor (via FTP/cPanel/SSH).
2. Crea la base de datos en el MySQL del hosting y ejecuta `backend/install/schema.sql`.
3. Edita `backend/config/database.php` con las credenciales reales de la base de datos del hosting (host, nombre de base de datos, usuario y password que entrega el proveedor).
4. Verifica que el `.htaccess` de `backend/` sea respetado por el servidor (Apache con `mod_rewrite` habilitado y `AllowOverride All`, tipico en hosting compartido con cPanel).

Nota: el `config/database.php` que esta en este repositorio contiene credenciales de una base de datos de un entorno real usado durante el desarrollo (ver [Notas de seguridad](#notas-de-seguridad-importantes)). Para cualquier despliegue nuevo, reemplaza esos valores por los propios.

## Variables de entorno y configuracion

El proyecto **no usa archivos `.env`**. Toda la configuracion vive directamente en el codigo:

| Configuracion | Archivo | Detalle |
|---|---|---|
| Conexion a base de datos (host, nombre de BD, usuario, password) | `backend/config/database.php` | Funcion `getDB()`, PDO sobre MySQL |
| Puerto del frontend en desarrollo | `frontend/vite.config.js` | `server.port` (3000) |
| Proxy del frontend hacia el backend | `frontend/vite.config.js` | `server.proxy['/backend'].target` |
| URL base que usa el frontend para llamar a la API | `frontend/src/lib/api.js` | Constante `BASE = '/backend'` (ruta relativa) |
| Token de sesion del usuario | `localStorage` del navegador | Clave `box_token`, enviado en header `X-Token` |
| Tema/colores de la interfaz | `frontend/tailwind.config.js` | Paleta de color `primary` y tipografia `Inter` |

Si en el futuro se quiere desacoplar la configuracion del codigo (recomendado, especialmente para las credenciales de base de datos), se puede introducir un archivo `.env` leido por PHP (por ejemplo via `vlucas/phpdotenv` u otra libreria) y por Vite (variables `VITE_*`), pero actualmente el proyecto no esta estructurado de esa forma.

## Estructura de carpetas

```
box sistema/
├── INSTALAR.md              Guia rapida de instalacion original
├── MANUAL.md                Manual de usuario funcional (modulo por modulo)
├── README.md                Este documento (guia tecnica consolidada)
├── backend-serve.log        Log de una ejecucion previa del servidor PHP embebido
├── frontend-serve.log       Log de una ejecucion previa de Vite (dev server)
│
├── backend/                 API en PHP puro
│   ├── index.php            Punto de entrada: enrutador principal (switch por recurso)
│   ├── .htaccess            Reescritura de URLs para Apache + forwarding del header Authorization
│   ├── debug_headers.php    Script de diagnostico de headers HTTP
│   ├── test_auth.php        Script de prueba de autenticacion
│   ├── config/
│   │   └── database.php     Conexion PDO a MySQL (host/BD/usuario/password)
│   ├── middleware/
│   │   └── auth.php         Obtencion de token y validacion de sesion (requireAuth/getAuthUser)
│   ├── routes/               Un archivo PHP por recurso de la API, por ejemplo:
│   │   ├── auth.php              Login/logout/me
│   │   ├── productos.php         CRUD de productos, ajuste de precios
│   │   ├── catalogo.php          Catalogo global de productos
│   │   ├── categorias.php        Categorias de productos
│   │   ├── unidades.php          Unidades de medida
│   │   ├── clientes.php          Clientes y fiado
│   │   ├── proveedores.php       Proveedores
│   │   ├── cuentas_pagar.php     Cuentas por pagar a proveedores
│   │   ├── ventas.php            Ventas (POS, 2 terminales)
│   │   ├── compras.php           Compras a proveedores
│   │   ├── prestamos.php         Fiado de clientes
│   │   ├── prestamos_dinero.php  Prestamos de dinero (prestado/recibido)
│   │   ├── pedidos.php           Pedidos a proveedores
│   │   ├── cambios.php           Cambios/devoluciones de productos
│   │   ├── caja.php              Apertura/cierre de caja
│   │   ├── ingresos_egresos.php  Ingresos y egresos de caja
│   │   ├── movimientos.php       Movimientos de inventario
│   │   ├── traspasos.php         Traspasos entre sucursales/almacenes
│   │   ├── depositos.php         Depositos/cuentas bancarias
│   │   ├── tiendas.php           Sucursales y almacenes
│   │   ├── usuarios.php          Usuarios del sistema (CRUD, roles)
│   │   ├── empleados.php         Personal (distinto de usuarios del sistema)
│   │   ├── asistencia.php        Asistencia diaria del personal
│   │   ├── configuracion.php     Configuracion general
│   │   ├── reportes.php          Reportes (resumen, ventas, stock, top productos, prestamos)
│   │   ├── registro_cambios.php  Auditoria de cambios del sistema
│   │   ├── tarjetas.php          Ventas de tarjetas/recargas
│   │   └── tienda_publica.php    Endpoints publicos (sin autenticacion) de la tienda
│   ├── install/
│   │   └── schema.sql       Script SQL completo (crea BD y todas las tablas)
│   └── uploads/              Imagenes de productos subidas desde el sistema
│
└── frontend/                 Aplicacion React (Vite)
    ├── index.html             HTML raiz
    ├── package.json           Dependencias y scripts (dev/build/preview)
    ├── package-lock.json      Lockfile de npm
    ├── vite.config.js         Configuracion de Vite (puerto 3000, proxy /backend)
    ├── tailwind.config.js     Configuracion de Tailwind CSS (colores, tipografia)
    ├── postcss.config.js      Configuracion de PostCSS (Tailwind + Autoprefixer)
    ├── dist/                  Build de produccion generado por `npm run build`
    ├── node_modules/          Dependencias instaladas (generadas por `npm install`)
    ├── public/                Archivos estaticos servidos tal cual (logo, imagenes, .htaccess)
    └── src/
        ├── main.jsx              Punto de entrada de React
        ├── App.jsx               Definicion de rutas (React Router) y layout general
        ├── index.css             Estilos globales (Tailwind)
        ├── components/           Componentes reutilizables (Layout, RequirePermiso, etc.)
        ├── context/
        │   ├── AuthContext.jsx       Sesion del usuario, rol y permisos (PERMISOS)
        │   └── CartContext.jsx       Carrito de venta (2 terminales independientes)
        ├── lib/
        │   └── api.js                Cliente HTTP centralizado hacia el backend
        └── pages/                 Una carpeta por modulo funcional:
            ├── Dashboard.jsx
            ├── Login.jsx
            ├── ventas/            Lista y nueva venta (POS)
            ├── compras/
            ├── productos/
            ├── clientes/
            ├── proveedores/
            ├── prestamos/
            ├── pedidos/
            ├── cambios/
            ├── caja/
            ├── movimientos/
            ├── traspasos/
            ├── tarjetas/
            ├── depositos/
            ├── reportes/
            ├── configuracion/
            ├── asistencia/
            └── tienda/            Vista publica de tienda
```

## Modulos del sistema

| Modulo | Ruta en el frontend | Recurso de la API |
|---|---|---|
| Dashboard | `/` | — |
| Ventas | `/ventas` | `/backend/ventas` |
| Nueva venta | `/ventas/nueva` | `/backend/ventas` |
| Compras | `/compras` | `/backend/compras` |
| Productos | `/productos` | `/backend/productos`, `/backend/catalogo` |
| Clientes | `/clientes` | `/backend/clientes` |
| Proveedores | `/proveedores` | `/backend/proveedores` |
| Cuentas por pagar | `/cuentas-pagar` | `/backend/cuentas-pagar` |
| Prestamos (fiado) | `/prestamos` | `/backend/prestamos` |
| Prestamos de dinero | `/prestamos/dinero` | `/backend/prestamos-dinero` |
| Pedidos | `/pedidos` | `/backend/pedidos` |
| Cambios | `/cambios` | `/backend/cambios` |
| Caja | `/caja` | `/backend/caja`, `/backend/ingresos-egresos` |
| Tarjetas/Recargas | `/tarjetas` | `/backend/tarjetas` |
| Movimientos | `/movimientos` | `/backend/movimientos`, `/backend/traspasos` |
| Reportes | `/reportes` | `/backend/reportes` |
| Configuracion | `/configuracion` | `/backend/tiendas`, `/backend/usuarios`, `/backend/depositos`, `/backend/empleados`, `/backend/registro-cambios` |
| Asistencia | `/asistencia` | `/backend/asistencia` |

El detalle funcional de cada modulo (que hace cada boton, flujos de uso, preguntas frecuentes) esta en `MANUAL.md`.

## Roles y permisos

| Modulo | Admin | Gerente | Vendedor |
|---|---|---|---|
| Dashboard | Si | Si | Si |
| Ventas | Si | Si | Si |
| Compras | Si | Si | Si |
| Productos | Si | Si | Solo ver |
| Clientes | Si | Si | Si |
| Proveedores | Si | Si | No |
| Cuentas por pagar | Si | Si | No |
| Prestamos (fiado) | Si | Si | Si |
| Prestamo de dinero | Si | Si | No |
| Pedidos | Si | Si | No |
| Cambios | Si | Si | Si |
| Caja | Si | Si | Si |
| Movimientos de inventario | Si | Si | No |
| Tarjetas/Recargas | Si | Si | Si |
| Asistencia | Si | Si | No |
| Reportes | Si | Si | No |
| Configuracion | Si | Solo ver | No |

Un usuario puede ademas quedar bloqueado manualmente o fuera de su horario laboral configurado, lo que le impide iniciar sesion (logica en `backend/routes/auth.php` y `frontend/src/context/AuthContext.jsx`).

## Credenciales de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `password` | Administrador (acceso total) |
| `vendedor1` | `password` | Vendedor Sucursal 1 |
| `vendedor2` | `password` | Vendedor Sucursal 1 |
| `vendedor3` | `password` | Vendedor Sucursal 2 |

Estas credenciales corresponden a los datos semilla del entorno de desarrollo/pruebas. En un despliegue nuevo, estos usuarios deben crearse manualmente (modulo Configuracion -> Usuarios) con contraseñas propias.

## Notas de seguridad importantes

Este repositorio es un **respaldo integro** de la carpeta de trabajo tal como estaba en el equipo local, por lo que incluye archivos que normalmente no se publican en un repositorio de codigo:

- `backend/config/database.php` contiene host, nombre de base de datos, usuario y contraseña de una base de datos real usada durante el desarrollo del sistema (no son solo datos de ejemplo tipo `root`/vacio).
- `frontend/node_modules/` y `frontend/dist/` (dependencias instaladas y build compilado) estan incluidos completos, en lugar de regenerarse con `npm install` / `npm run build`.
- Los archivos `backend-serve.log` y `frontend-serve.log` son logs de ejecuciones previas en la maquina local.

Como este es un **repositorio publico**, cualquier persona en internet puede ver esas credenciales de base de datos. Se recomienda, en cuanto sea posible:

1. Cambiar la contraseña de esa base de datos (y la del usuario de MySQL asociado) en el proveedor de hosting correspondiente.
2. Si el repositorio se usa como backup "frio" (solo para recuperar el proyecto, no para seguir publicandolo tal cual), considerar luego hacerlo privado o limpiar el historial de git de esas credenciales con herramientas como `git filter-repo`.

Esto no se corrigio automaticamente en este respaldo porque la instruccion explicita fue subir todo el contenido tal cual, sin exclusiones.

## Archivos de referencia adicionales

- `INSTALAR.md` — guia corta original de instalacion (XAMPP + base de datos + frontend).
- `MANUAL.md` — manual de usuario completo, modulo por modulo, con flujos de uso y preguntas frecuentes.
