const BASE = '/backend'

function token() { return localStorage.getItem('box_token') || '' }

async function req(method, path, body, params) {
  const url = new URL(BASE + path, window.location.origin)
  if (params) Object.entries(params).forEach(([k,v]) => v != null && url.searchParams.set(k, v))
  const isFormData = body instanceof FormData
  const res = await fetch(url.toString(), {
    method,
    headers: isFormData ? { 'X-Token': token() } : { 'Content-Type': 'application/json', 'X-Token': token() },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new Event('session-expired'))
    }
    throw new Error(data.error || 'Error del servidor')
  }
  return data
}

export const api = {
  // Auth
  login:   (b)     => req('POST', '/auth/login', b),
  me:      ()      => req('GET',  '/auth/me'),
  logout:  ()      => req('POST', '/auth/logout'),

  // Tiendas (sucursales)
  getTiendas:    (p)    => req('GET',    '/tiendas', null, p),
  // Almacenes (tipo='deposito') — pasar sucursal_id para filtrar por sucursal
  getAlmacenes:  (p)    => req('GET',    '/tiendas', null, { tipo: 'deposito', ...p }),
  addTienda:     (b)    => req('POST',   '/tiendas', b),
  updateTienda:  (id,b) => req('PUT',    `/tiendas/${id}`, b),
  uploadLogoTienda: (id, fd) => req('PUT', `/tiendas/${id}`, fd),
  deleteTienda:  (id)   => req('DELETE', `/tiendas/${id}`),

  // Usuarios
  getUsuarios:   ()     => req('GET',    '/usuarios'),
  addUsuario:    (b)    => req('POST',   '/usuarios', b),
  updateUsuario: (id,b) => req('PUT',    `/usuarios/${id}`, b),
  deleteUsuario: (id)   => req('DELETE', `/usuarios/${id}`),

  // Productos
  getProductos:   (p)    => req('GET',    '/productos', null, p),
  getProducto:    (id)   => req('GET',    `/productos/${id}`),
  addProducto:    (b)    => req('POST',   '/productos', b),
  updateProducto: (id,b) => req('POST',   `/productos/${id}?action=editar`, b),
  deleteProducto:    (id)   => req('DELETE', `/productos/${id}`),
  ajustePrecio:      (b)    => req('POST',   '/productos?action=ajuste_precio', b),

  // Catálogo global
  getCatalogo:     (p)    => req('GET',    '/catalogo', null, p),
  addCatalogo:     (b)    => req('POST',   '/catalogo', b),
  updateCatalogo:  (id,b) => req('PUT',    `/catalogo/${id}`, b),
  deleteCatalogo:  (id)   => req('DELETE', `/catalogo/${id}`),

  // Categorias
  getCategorias:   (p)    => req('GET',    '/categorias', null, p),
  addCategoria:    (b)    => req('POST',   '/categorias', b),
  updateCategoria: (id,b) => req('PUT',    `/categorias/${id}`, b),
  deleteCategoria: (id)   => req('DELETE', `/categorias/${id}`),

  // Unidades
  getUnidades:   (p)    => req('GET',    '/unidades', null, p),
  addUnidad:     (b)    => req('POST',   '/unidades', b),
  updateUnidad:  (id,b) => req('PUT',    `/unidades/${id}`, b),
  deleteUnidad:  (id)   => req('DELETE', `/unidades/${id}`),

  // Clientes
  getClientes:   (p)    => req('GET',    '/clientes', null, p),
  addCliente:    (b)    => req('POST',   '/clientes', b),
  updateCliente: (id,b) => req('PUT',    `/clientes/${id}`, b),
  deleteCliente: (id)   => req('DELETE', `/clientes/${id}`),

  // Proveedores
  getProveedores:   ()     => req('GET',    '/proveedores'),
  addProveedor:     (b)    => req('POST',   '/proveedores', b),
  updateProveedor:  (id,b) => req('PUT',    `/proveedores/${id}`, b),
  deleteProveedor:  (id)   => req('DELETE', `/proveedores/${id}`),

  // Ventas
  getVentas:   (p)    => req('GET',  '/ventas', null, p),
  getVenta:    (id)   => req('GET',  `/ventas/${id}`),
  addVenta:    (b)    => req('POST', '/ventas', b),
  anularVenta: (id)   => req('PUT',  `/ventas/${id}/anular`),

  // Compras
  getCompras: (p)  => req('GET',  '/compras', null, p),
  getCompra:  (id) => req('GET',  `/compras/${id}`),
  addCompra:  (b)  => req('POST', '/compras', b),

  // Préstamos (fiado)
  getPrestamos: (p)     => req('GET',  '/prestamos', null, p),
  getPrestamo:  (id)    => req('GET',  `/prestamos/${id}`),
  addPrestamo:  (b)     => req('POST', '/prestamos', b),
  pagarPrestamo:(id,b)  => req('POST', `/prestamos/${id}/pagar`, b),

  // Préstamos dinero
  getPrestamosDinero:  (p)    => req('GET',  '/prestamos-dinero', null, p),
  getPrestamoDinero:   (id)   => req('GET',  `/prestamos-dinero/${id}`),
  addPrestamoDinero:   (b)    => req('POST', '/prestamos-dinero', b),
  pagarPrestamoDinero: (id,b) => req('POST', `/prestamos-dinero/${id}/pagar`, b),

  // Pedidos
  getPedidos:   (p)    => req('GET',  '/pedidos', null, p),
  getPedido:    (id)   => req('GET',  `/pedidos/${id}`),
  addPedido:    (b)    => req('POST', '/pedidos', b),
  recibirPedido:(id,b) => req('POST', `/pedidos/${id}/recibir`, b),

  // Cambios
  getCambios: (p) => req('GET',  '/cambios', null, p),
  addCambio:  (b) => req('POST', '/cambios', b),

  // Caja
  getCajaActual: (p) => req('GET',  '/caja/actual', null, p),
  getCajas:      (p) => req('GET',  '/caja', null, p),
  abrirCaja:     (b) => req('POST', '/caja/abrir', b),
  cerrarCaja:    (id,b) => req('POST', `/caja/${id}/cerrar`, b),

  // Ingresos/Egresos
  getIngresosEgresos: (p) => req('GET',  '/ingresos-egresos', null, p),
  addIngresoEgreso:   (b) => req('POST', '/ingresos-egresos', b),
  deleteIngresoEgreso:(id)=> req('DELETE',`/ingresos-egresos/${id}`),

  // Tarjetas/Recargas
  getTarjetas: (p) => req('GET',  '/tarjetas', null, p),
  addTarjeta:  (b) => req('POST', '/tarjetas', b),

  // Movimientos
  getMovimientos: (p) => req('GET',  '/movimientos', null, p),
  addMovimiento:  (b) => req('POST', '/movimientos', b),

  // Traspasos entre almacenes
  getTraspasos:      (p)      => req('GET',    '/traspasos', null, p),
  addTraspaso:       (b)      => req('POST',   '/traspasos', b),
  deleteTraspaso:    (id)     => req('DELETE', `/traspasos/${id}`),
  deleteTraspasoLote:(loteId) => req('DELETE', '/traspasos', null, { lote_id: loteId }),

  // Depósitos
  getDepositos:   ()     => req('GET',    '/depositos'),
  addDeposito:    (b)    => req('POST',   '/depositos', b),
  updateDeposito: (id,b) => req('PUT',    `/depositos/${id}`, b),
  deleteDeposito: (id)   => req('DELETE', `/depositos/${id}`),

  // Asistencia
  getAsistencia:  (p) => req('GET',  '/asistencia', null, p),
  addAsistencia:  (b) => req('POST', '/asistencia', b),

  // Empleados
  getEmpleados:   (p)    => req('GET',    '/empleados', null, p),
  addEmpleado:    (b)    => req('POST',   '/empleados', b),
  updateEmpleado: (id,b) => req('PUT',    `/empleados/${id}`, b),
  deleteEmpleado: (id)   => req('DELETE', `/empleados/${id}`),

  // Configuración
  getConfig:   () => req('GET', '/configuracion'),
  setConfig:   (b)=> req('PUT', '/configuracion', b),

  // Reportes
  getReporte:             (tipo, p) => req('GET', `/reportes/${tipo}`, null, p),
  getReporteResumen:      (p) => req('GET', '/reportes/resumen', null, p),
  getReporteVentasDia:    (p) => req('GET', '/reportes/ventas-dia', null, p),
  getReporteTopProductos: (p) => req('GET', '/reportes/productos-mas-vendidos', null, p),
  getReporteStock:        (p) => req('GET', '/reportes/stock', null, p),
  getReportePrestamos:    (p) => req('GET', '/reportes/prestamos-cobros', null, p),

  // Registro cambios
  getRegistroCambios: (p) => req('GET', '/registro-cambios', null, p),

  // Cuentas por pagar
  getCuentasPagar:   (p)    => req('GET',  '/cuentas-pagar', null, p),
  getCuentaPagar:    (id)   => req('GET',  `/cuentas-pagar/${id}`),
  addCuentaPagar:    (b)    => req('POST', '/cuentas-pagar', b),
  pagarCuenta:       (id,b) => req('POST', `/cuentas-pagar/${id}/pagar`, b),
  deleteCuentaPagar: (id)   => req('DELETE',`/cuentas-pagar/${id}`),
}
