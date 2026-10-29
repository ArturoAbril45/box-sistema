import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Search, Plus, Minus, Trash2, Check, X, Monitor, UserPlus, AlertTriangle, AlertCircle, Package, Warehouse, Eye, ChevronDown, Layers } from 'lucide-react'

const METODOS_PAGO = [
  { id: 'efectivo',   label: 'Efectivo' },
  { id: 'pago_banco', label: 'Pago Banco' },
  { id: 'fiado',      label: 'Fiado' },
]

const emptyCart = () => ({ items:[], clienteId:'', montosPago:{ efectivo:'', pago_banco:'', fiado:'' }, descuento:'', notas:'' })

function loadCart(t) {
  try {
    const c = JSON.parse(localStorage.getItem(`box_cart_t${t}`)) || emptyCart()
    c.items = (c.items || []).map(i => ({
      ...i,
      _itemKey: i._itemKey || String(i.producto_id),
      precio_unitario: parseFloat(i.precio_unitario) || 0,
      subtotal: parseFloat(i.subtotal) || 0,
      cantidad: parseFloat(i.cantidad) || 1,
      precio_original: parseFloat(i.precio_original) || parseFloat(i.precio_unitario) || 0,
    }))
    if (!c.montosPago) c.montosPago = { efectivo:'', pago_banco:'', fiado:'' }
    if (c.descuento === undefined) c.descuento = ''
    return c
  } catch { return emptyCart() }
}
function saveCart(t, cart) {
  localStorage.setItem(`box_cart_t${t}`, JSON.stringify(cart))
}

export default function NuevaVenta() {
  const { tiendaActual, tiendaLogo } = useAuth()
  const navigate = useNavigate()
  const searchRef = useRef()

  const [terminal, setTerminal]   = useState(1)
  const [cart, setCartRaw]        = useState(() => loadCart(1))
  const [productos, setProductos] = useState([])
  const [clientes, setClientes]   = useState([])
  const [tiendas, setTiendas]     = useState([])
  const [almacenId, setAlmacenId]     = useState(null)
  const [fraccionesAbiertas, setFraccionesAbiertas] = useState(new Set())

  function toggleFracciones(key) {
    setFraccionesAbiertas(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  const [todosProductos, setTodosProductos] = useState([])
  const [search, setSearch]           = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Modales
  const [modalConfirmar, setModalConfirmar]           = useState(false)
  const [destinoVenta, setDestinoVenta]               = useState(null) // 'cajero' | 'directo'
  const [modalPrecioCompra, setModalPrecioCompra]     = useState(null)
  const [modalCambioDeposito, setModalCambioDeposito] = useState(null)
  const [notaVenta, setNotaVenta]                     = useState(null) // snapshot de la venta completada
  const [terminalSearch, setTerminalSearch]           = useState('')
  const [menuImprimir, setMenuImprimir]               = useState(false)

  // Modal nuevo cliente
  const [modalCliente, setModalCliente]   = useState(false)
  const [formCliente, setFormCliente]     = useState({ nombre:'', telefono:'', direccion:'', empresa:'', nit:'', correo:'', ciudad:'' })
  const [savingCliente, setSavingCliente] = useState(false)

  // Deuda del cliente
  const [modalDeuda, setModalDeuda]     = useState(null)
  const [deudaEnCobro, setDeudaEnCobro] = useState(null)
  const [montoPagarDeuda, setMontoPagarDeuda] = useState('')

  // Selector cliente con filtrado
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteOpen, setClienteOpen]     = useState(false)
  const clienteRef = useRef()

  // Historial de productos del cliente seleccionado
  const [clienteHistorial, setClienteHistorial]     = useState([])
  const [loadingHistorial, setLoadingHistorial]     = useState(false)
  const [modalHistorial, setModalHistorial]         = useState(false)

  function setCart(fn) {
    setCartRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      saveCart(terminal, next)
      return next
    })
  }

  function cambiarTerminal(t) {
    setTerminal(t)
    setCartRaw(loadCart(t))
    setSearch('')
    setError('')
    setDeudaEnCobro(null)
    setClienteSearch('')
    setClienteOpen(false)
  }

  // Cierre del dropdown cliente al click fuera
  useEffect(() => {
    function handler(e) { if (clienteRef.current && !clienteRef.current.contains(e.target)) setClienteOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sincronizar nombre en input cuando cambia terminal (cart ya trae clienteId)
  useEffect(() => {
    if (cart.clienteId && clientes.length) {
      const c = clientes.find(cl => String(cl.id) === String(cart.clienteId))
      if (c) setClienteSearch(c.nombre)
    }
  }, [terminal, clientes])

  // Cargar tiendas/almacenes disponibles
  useEffect(() => {
    api.getTiendas().then(ts => {
      setTiendas(ts)
      if (tiendaActual && !almacenId) setAlmacenId(tiendaActual)
    }).catch(() => {})
  }, [tiendaActual])

  // Cargar productos del almacén seleccionado (para el cart)
  useEffect(() => {
    const tid = almacenId || tiendaActual
    if (!tid) return
    api.getProductos({ tienda_id: tid }).then(setProductos)
  }, [almacenId, tiendaActual])

  // Cargar productos de TODOS los almacenes para la búsqueda global
  useEffect(() => {
    if (!tiendas.length) return
    Promise.all(
      tiendas.map(t => api.getProductos({ tienda_id: t.id }).then(ps => ps.map(p => ({ ...p, _tiendaNombre: t.nombre, _tiendaId: t.id }))).catch(() => []))
    ).then(results => setTodosProductos(results.flat()))
  }, [tiendas])

  useEffect(() => {
    if (!tiendaActual) return
    api.getClientes({ tienda_id: tiendaActual }).then(setClientes)
  }, [tiendaActual])

  // Cuando cambia el cliente, verificar deuda
  const { clienteId } = cart
  useEffect(() => {
    setDeudaEnCobro(null)
    setModalDeuda(null)
    if (!clienteId || !tiendaActual) return
    const c = clientes.find(cl => String(cl.id) === String(clienteId))
    if (!c || parseFloat(c.saldo_pendiente||0) <= 0) return

    api.getPrestamos({ tienda_id: tiendaActual, cliente_id: clienteId }).then(async prest => {
      const pendientes = prest.filter(p => p.estado === 'pendiente' || p.estado === 'parcial')
      if (!pendientes.length) return
      // cargar detalle con pagos de cada préstamo
      const prestamosDetalle = await Promise.all(
        pendientes.map(p => api.getPrestamo(p.id).catch(() => p))
      )
      const totalDeuda = prestamosDetalle.reduce((s, p) => s + parseFloat(p.saldo||0), 0)
      setModalDeuda({ prestamos: prestamosDetalle, items: [], total: totalDeuda })
      setMontoPagarDeuda(totalDeuda.toFixed(2))
    })
  }, [clienteId, clientes, tiendaActual])

  // Cargar historial de productos del cliente seleccionado
  useEffect(() => {
    setClienteHistorial([])
    setModalHistorial(false)
    if (!clienteId || !tiendaActual) return
    setLoadingHistorial(true)
    Promise.all([
      api.getVentas({ cliente_id: clienteId, desde: '2000-01-01', hasta: '2099-12-31' }),
      api.getTiendas(),
    ]).then(async ([vts, tiendas]) => {
      // Stock por producto en cada almacén: { producto_id: [ {tienda_id, nombre, stock} ] }
      const productosPorTienda = await Promise.all(
        tiendas.map(t => api.getProductos({ tienda_id: t.id }).then(ps => ({ tienda: t, ps })).catch(() => ({ tienda: t, ps: [] })))
      )
      const stockMap = {}
      productosPorTienda.forEach(({ tienda, ps }) => {
        ps.forEach(p => {
          if (!stockMap[p.id]) stockMap[p.id] = []
          stockMap[p.id].push({ tienda_id: tienda.id, nombre: tienda.nombre, stock: parseFloat(p.stock||0), unidad: p.unidad })
        })
      })

      const activas = vts.filter(v => v.estado !== 'anulada')
      const detalles = await Promise.all(activas.map(v => api.getVenta(v.id).catch(() => null)))
      const visto = {}
      const items = []
      detalles.forEach((d, idx) => {
        if (!d || !d.items) return
        const venta = activas[idx]
        d.items.forEach(item => {
          if (item.producto_id && !visto[item.producto_id]) {
            visto[item.producto_id] = true
            items.push({ ...item, fecha: venta.fecha, almacenes: stockMap[item.producto_id] || [] })
          }
        })
      })
      setClienteHistorial(items)
    }).finally(() => setLoadingHistorial(false))
  }, [clienteId, tiendaActual])

  // Búsqueda global: agrupar por nombre/código, mostrando stock por almacén
  const filtrados = (() => {
    if (search.length < 2) return []
    const q = search.toLowerCase()
    const fuente = todosProductos.length ? todosProductos : productos
    const matches = fuente.filter(p =>
      (p.nombre.toLowerCase().includes(q) || (p.codigo||'').toLowerCase().includes(q))
      && (parseFloat(p.stock || 0) > 0 || parseFloat(p.stock_fraccion_actual || 0) > 0)
    )
    // Si hay un solo almacén, devolver directo
    if (tiendas.length <= 1) return matches
    // Agrupar por código/nombre: { key -> { base: prod, almacenes: [{tiendaNombre, tiendaId, stock, prod}] } }
    const grupos = {}
    matches.forEach(p => {
      const key = p.codigo || p.nombre
      if (!grupos[key]) grupos[key] = { base: p, almacenes: [] }
      grupos[key].almacenes.push({ tiendaNombre: p._tiendaNombre, tiendaId: p._tiendaId, stock: p.stock, prod: p })
    })
    return Object.values(grupos)
  })()

  function agregarItem(prod, precio, division = null) {
    const p = parseFloat(precio) || 0
    const key = division ? `${prod.id}_div_${division.nombre}` : String(prod.id)
    setCart(prev => {
      const ex = prev.items.find(i => i._itemKey === key)
      const tiendaNombre = prod._tiendaNombre || tiendas.find(t => t.id === (prod._tiendaId||prod.tienda_id||almacenId||tiendaActual))?.nombre || ''
      const base = {
        _itemKey: key,
        producto_id: prod.id,
        nombre_producto: prod.nombre,
        division_nombre: division?.nombre || null,
        division_cantidad: division ? parseFloat(division.cantidad) : null,
        cantidad_disponible: division ? parseFloat(prod.cantidad_divisible || 0) : null,
        cantidad: 1, unidad: division?.nombre || prod.unidad || 'Unidad',
        precio_unitario: p, precio_original: p, subtotal: p, precio_modificado: false,
        foto: prod.foto||'', precio_compra: parseFloat(prod.precio_compra||0),
        almacen_id: prod._tiendaId || prod.tienda_id || null, almacen_nombre: tiendaNombre,
      }
      const items = ex
        ? prev.items.map(i => i._itemKey === key ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario } : i)
        : [...prev.items, base]
      return { ...prev, items }
    })
    searchRef.current?.focus()
  }

  function cambiarCantidad(key, delta) {
    setCart(prev => ({ ...prev, items: prev.items.map(i => {
      if (i._itemKey !== key) return i
      const c = Math.max(0.5, parseFloat((i.cantidad + delta).toFixed(2)))
      return { ...i, cantidad: c, subtotal: c * i.precio_unitario }
    })}))
  }

  function cambiarPrecio(key, val) {
    setCart(prev => ({ ...prev, items: prev.items.map(i => {
      if (i._itemKey !== key) return i
      const nuevo = parseFloat(val) || 0
      return { ...i, precio_unitario: nuevo, subtotal: i.cantidad * nuevo, precio_modificado: nuevo !== (i.precio_original || 0) }
    })}))
  }

  function quitarItem(key) { setCart(prev => ({ ...prev, items: prev.items.filter(i => i._itemKey !== key) })) }
  function limpiar() { setCart(emptyCart()); setDeudaEnCobro(null) }

  async function guardarCliente() {
    if (!formCliente.nombre.trim()) return
    setSavingCliente(true)
    try {
      const nuevo = await api.addCliente({ ...formCliente, tienda_id: tiendaActual })
      const lista = await api.getClientes({ tienda_id: tiendaActual })
      setClientes(lista)
      setCart(p => ({ ...p, clienteId: String(nuevo.id) }))
      setModalCliente(false)
      setFormCliente({ nombre:'', telefono:'', direccion:'', empresa:'', nit:'', correo:'', ciudad:'' })
    } catch(e) { alert(e.message) } finally { setSavingCliente(false) }
  }

  const { items, montosPago, descuento, notas } = cart
  const subtotal     = items.reduce((s, i) => s + (parseFloat(i.subtotal)||0), 0)
  const montoDesc    = Math.min(subtotal, Math.max(0, parseFloat(descuento)||0))
  const total        = Math.max(0, subtotal - montoDesc)
  const deudaCobrar  = deudaEnCobro ? (deudaEnCobro.montoPagar ?? deudaEnCobro.total) : 0
  const totalACobrar = total + deudaCobrar
  const totalPagado  = METODOS_PAGO.reduce((s, m) => s + (parseFloat(montosPago[m.id])||0), 0)
  const vuelto       = Math.max(0, totalPagado - totalACobrar)
  const falta        = Math.max(0, totalACobrar - totalPagado)

  // Auto-fiado: solo cuando hay cliente
  useEffect(() => {
    const pagadoSinFiado = (parseFloat(montosPago.efectivo)||0) + (parseFloat(montosPago.pago_banco)||0)
    const resto = clienteId ? Math.max(0, totalACobrar - pagadoSinFiado) : 0
    const fiadoActual = parseFloat(montosPago.fiado)||0
    if (Math.abs(resto - fiadoActual) < 0.001) return
    setCart(p => ({ ...p, montosPago: { ...p.montosPago, fiado: resto > 0 ? resto.toFixed(2) : '' } }))
  }, [montosPago.efectivo, montosPago.pago_banco, totalACobrar])

  function imprimir(tipo) {
    const cliente = clienteId ? clientes.find(c => String(c.id) === String(clienteId)) : null
    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit', year:'numeric' })
    const hora  = ahora.toLocaleTimeString('es-BO', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    const tiendaNombre = tiendas.find(t => t.id === (almacenId||tiendaActual))?.nombre || 'Comercial Boxer'
    const logoUrl = tiendaLogo ? (window.location.origin + tiendaLogo) : (window.location.origin + '/boxer-logo.png')
    const esTermica = tipo === 'termica'

    const cssTermica = `
      body { font-family: monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 8px; }
      h1 { font-size: 17px; font-weight: bold; text-align: center; margin: 0 0 2px; letter-spacing: 1px; }
      .tienda { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 4px; }
      .fechalinea { text-align: center; font-size: 11px; margin-bottom: 4px; }
      .cliente { text-align: center; font-size: 11px; margin-bottom: 4px; }
      hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { text-align: left; border-bottom: 1px solid #000; padding: 3px 2px; font-size: 11px; }
      td { padding: 3px 2px; vertical-align: top; border-bottom: 1px dotted #ccc; }
      .tdcant { width: 30px; text-align: center; }
      .tddep { font-size: 10px; color: #444; }
      .totales { margin-top: 6px; }
      .totline { display: flex; justify-content: space-between; font-size: 12px; padding: 1px 0; }
      .totline.grande { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 2px; }
      .pie { text-align: center; font-size: 10px; margin-top: 8px; }
    `
    const cssNormal = `
      body { font-family: Arial, sans-serif; font-size: 13px; max-width: 720px; margin: 20px auto; padding: 24px; color: #111; }
      .cabecera { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #111; padding-bottom: 12px; margin-bottom: 14px; }
      .cabecera img { width: 70px; height: 70px; object-fit: contain; }
      .cabtitulo h1 { font-size: 28px; font-weight: 900; margin: 0; letter-spacing: 2px; }
      .cabtitulo .tienda { font-size: 16px; font-weight: bold; color: #444; margin-top: 2px; }
      .fechalinea { font-size: 12px; color: #555; margin-bottom: 14px; }
      .cliente { font-size: 12px; color: #333; margin-bottom: 14px; }
      hr { border: none; border-top: 1px solid #ccc; margin: 10px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; border-bottom: 2px solid #111; padding: 7px 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
      td { padding: 6px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
      .tdcant { width: 50px; text-align: center; font-weight: bold; }
      .tddep { font-size: 11px; color: #666; }
      .totales { margin-top: 14px; border-top: 2px solid #111; padding-top: 10px; }
      .totline { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
      .totline.grande { font-size: 18px; font-weight: 900; }
      .pie { text-align: center; font-size: 11px; color: #999; margin-top: 24px; }
    `

    const filas = items.map(item => `
      <tr>
        <td class="tdcant">${item.cantidad}</td>
        <td>${item.nombre_producto}${item.almacen_nombre ? `<div class="tddep">${item.almacen_nombre}</div>` : ''}</td>
        <td class="tddep" style="text-align:right">${item.almacen_nombre || ''}</td>
      </tr>`).join('')

    const totalesHtml = `
      <div class="totales">
        ${montoDesc > 0 ? `<div class="totline"><span>Subtotal</span><span>Bs. ${subtotal.toFixed(2)}</span></div><div class="totline"><span>Descuento</span><span>- Bs. ${montoDesc.toFixed(2)}</span></div>` : ''}
        <div class="totline grande"><span>TOTAL</span><span>Bs. ${total.toFixed(2)}</span></div>
        ${deudaCobrar > 0 ? `<div class="totline"><span>Deuda anterior</span><span>Bs. ${deudaCobrar.toFixed(2)}</span></div><div class="totline grande"><span>TOTAL A COBRAR</span><span>Bs. ${totalACobrar.toFixed(2)}</span></div>` : ''}
        ${METODOS_PAGO.filter(m=>parseFloat(montosPago[m.id])>0).map(m=>`<div class="totline"><span>${m.label}</span><span>Bs. ${parseFloat(montosPago[m.id]).toFixed(2)}</span></div>`).join('')}
        ${vuelto > 0 ? `<div class="totline" style="color:green"><span>Cambio</span><span>Bs. ${vuelto.toFixed(2)}</span></div>` : ''}
      </div>`

    const clienteHtml = cliente
      ? `<div class="cliente">Cliente: <strong>${cliente.nombre}</strong>${cliente.telefono ? ' · ' + cliente.telefono : ''}</div>` : ''

    const htmlTermica = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pedido</title>
      <style>${cssTermica}@media print{button{display:none}}</style></head>
      <body>
        <h1>PEDIDO</h1>
        <div class="tienda">${tiendaNombre}</div>
        <div class="fechalinea">Fecha: ${fecha} &nbsp;&nbsp; Hora: ${hora}</div>
        ${clienteHtml}
        <hr/>
        <table>
          <thead><tr><th class="tdcant">Cant</th><th>Producto</th><th>Depósito</th></tr></thead>
          <tbody>${items.map(i=>`<tr><td class="tdcant">${i.cantidad}</td><td>${i.nombre_producto}</td><td class="tddep">${i.almacen_nombre||''}</td></tr>`).join('')}</tbody>
        </table>
        <hr/>
        ${totalesHtml}
        ${notas ? `<hr/><div class="pie">Notas: ${notas}</div>` : ''}
        <div class="pie">Gracias por su compra</div>
      </body></html>`

    const htmlNormal = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pedido</title>
      <style>${cssNormal}@media print{button{display:none}}</style></head>
      <body>
        <div class="cabecera">
          <img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'"/>
          <div class="cabtitulo">
            <h1>PEDIDO</h1>
            <div class="tienda">${tiendaNombre}</div>
          </div>
        </div>
        <div class="fechalinea">Fecha: ${fecha} &nbsp;&nbsp;&nbsp; Hora: ${hora}</div>
        ${clienteHtml}
        <table>
          <thead><tr><th class="tdcant">Cant</th><th>Producto</th><th>Depósito</th></tr></thead>
          <tbody>${items.map(i=>`<tr><td class="tdcant">${i.cantidad}</td><td>${i.nombre_producto}</td><td class="tddep">${i.almacen_nombre||''}</td></tr>`).join('')}</tbody>
        </table>
        ${totalesHtml}
        ${notas ? `<hr/><div class="pie">Notas: ${notas}</div>` : ''}
        <div class="pie">Gracias por su compra</div>
      </body></html>`

    const w = esTermica ? 320 : 794
    const win = window.open('', '_blank', `width=${w},height=650`)
    win.document.write(esTermica ? htmlTermica : htmlNormal)
    win.document.close()
    win.onload = () => win.print()
  }

  // Cobrar Ahora: guarda la venta en DB y va a la lista
  async function handleSave() {
    if (!items.length) { setError('Agrega al menos un producto'); return }
    const metodosUsados = METODOS_PAGO.filter(m => parseFloat(montosPago[m.id]) > 0)
    if (parseFloat(montosPago.fiado) > 0 && !clienteId) { setError('Selecciona un cliente para fiado'); return }
    const forma_pago = metodosUsados.length === 0 ? 'efectivo' : metodosUsados.length === 1 ? metodosUsados[0].id : 'mixto'
    setSaving(true); setError('')
    try {
      await api.addVenta({
        tienda_id: tiendaActual,
        cliente_id: clienteId || null,
        subtotal, descuento: montoDesc, total,
        pagado: Math.max(0, total - (parseFloat(montosPago.fiado) || 0)),
        fiado: parseFloat(montosPago.fiado) || 0,
        forma_pago,
        montos_pago: JSON.stringify(montosPago),
        notas, items,
      })
      if (deudaEnCobro && clienteId) {
        const pagoDeuda = deudaEnCobro.montoPagar ?? deudaEnCobro.total
        if (pagoDeuda > 0) {
          let restante = pagoDeuda
          for (const p of deudaEnCobro.prestamos) {
            if (restante <= 0) break
            const abonar = Math.min(restante, parseFloat(p.saldo||0))
            if (abonar > 0) { await api.pagarPrestamo(p.id, { monto: abonar, forma_pago }); restante -= abonar }
          }
        }
      }
      saveCart(terminal, emptyCart())
      setCart(emptyCart())
      navigate('/admin/ventas')
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  // Enviar al Cajero: agrega a la cola sin guardar en DB todavía
  function handleEnviarAlCajero() {
    if (!items.length) { setError('Agrega al menos un producto'); return }
    const snapshot = {
      id: Date.now().toString(),
      fechaEnvio: new Date().toISOString(),
      tienda_id: tiendaActual,
      cliente_id: clienteId || null,
      notas,
      items: [...items],
      subtotal, montoDesc, total,
      deudaCobrar,
      totalACobrar,
      // montosPago pre-cargados (el cajero puede editarlos)
      montosPago: { ...montosPago },
      deudaEnCobro: deudaEnCobro ? { ...deudaEnCobro } : null,
      clienteNombre: clienteId ? clientes.find(c => String(c.id) === String(clienteId))?.nombre || '' : '',
      tiendaNombre: tiendas.find(t => t.id === (almacenId||tiendaActual))?.nombre || 'Comercial Boxer',
    }
    try {
      const cola = JSON.parse(localStorage.getItem('box_cajero_cola') || '[]')
      cola.push(snapshot)
      localStorage.setItem('box_cajero_cola', JSON.stringify(cola))
    } catch {}
    saveCart(terminal, emptyCart())
    setCart(emptyCart())
    navigate('/admin/cajero')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/ventas')} className="btn btn-ghost btn-sm"><X size={14}/> Cancelar</button>
        <h1 className="text-xl font-bold text-slate-800">Nueva Venta</h1>
        <div className="ml-auto flex items-center gap-3 flex-wrap justify-end">
          {/* Terminales */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <Monitor size={14} className="text-slate-400 ml-1"/>
            {[1,2,3,4].map(t => (
              <button key={t} onClick={() => cambiarTerminal(t)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${terminal===t?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                T{t}
                {loadCart(t).items.length > 0 && terminal !== t && <span className="ml-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] inline-flex items-center justify-center">{loadCart(t).items.length}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Buscador + productos */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card p-4">
            <div className="flex gap-2 mb-3">
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 flex-1">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input ref={searchRef} className="flex-1 py-2 text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-800" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto por nombre o código..." autoFocus />
              </div>
              {tiendas.length > 1 && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 shrink-0">
                  <Warehouse size={13} className="text-amber-600 shrink-0"/>
                  <select
                    value={almacenId || ''}
                    onChange={e => { setAlmacenId(Number(e.target.value)); setSearch('') }}
                    className="text-xs font-semibold text-amber-700 bg-transparent border-none outline-none cursor-pointer py-2">
                    {tiendas.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {filtrados.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                {filtrados.map((entry, ei) => {
                  // entry puede ser un producto directo (1 almacén) o un grupo {base, almacenes}
                  const isGrupo = !!entry.almacenes
                  const base = isGrupo ? entry.base : entry
                  return (
                    <div key={isGrupo ? (base.codigo||base.nombre) : base.id} className="border-b border-slate-100 last:border-0 px-4 py-2.5">
                      <div className="flex items-start gap-3 mb-2">
                        {base.foto
                          ? <img src={base.foto} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-100"/>
                          : <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Package size={22} className="text-slate-300"/></div>
                        }
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{base.nombre}</p>
                          <p className="text-xs text-slate-400 mb-1">{base.codigo}</p>
                          {/* Stock por almacén */}
                          {isGrupo ? (
                            <div className="flex flex-wrap gap-1">
                              {entry.almacenes.map(a => (
                                <span key={a.tiendaId} className={`text-[10px] font-medium ${a.stock > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                  {a.tiendaNombre}: {a.stock} {base.unidad}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Stock: {base.stock} {base.unidad}</span>
                          )}
                        </div>
                      </div>
                      {/* Botones de precio — si el producto permite dividir, mostrar fracciones */}
                      {isGrupo ? (
                        <div className="flex flex-col gap-1.5">
                          {entry.almacenes.map(a => {
                            const divisiones = a.prod.divisiones || []
                            const esDivisible = a.prod.permite_dividir && divisiones.length > 0
                            return (
                              <div key={a.tiendaId}>
                                <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                                  {a.tiendaNombre}
                                  {esDivisible && (
                                    <span className="ml-2 text-blue-500 normal-case font-normal">{parseFloat(a.prod.stock_fraccion_actual || 0).toFixed(2)} sueltos disp.</span>
                                  )}
                                </p>
                                <div className="flex flex-col gap-1.5">
                                  {parseFloat(a.prod.stock || 0) > 0 && (
                                    <div className="flex gap-1.5 flex-wrap">
                                      {[{ l:'Mayor', v: a.prod.precio_mayor }, { l:'S/Fact.', v: a.prod.precio_sin_factura }, { l:'C/Fact.', v: a.prod.precio_facturado }].map(({ l, v }) => (
                                        <button key={l} onClick={() => agregarItem(a.prod, v)}
                                          className="flex-1 py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold transition-all border border-blue-100 hover:border-blue-600">
                                          {l}<br/>Bs.{(parseFloat(v)||0).toFixed(2)}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {esDivisible && (
                                    <button type="button" onClick={() => toggleFracciones(a.prod.id)}
                                      className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 self-start">
                                      <Layers size={11}/> {fraccionesAbiertas.has(a.prod.id) ? 'Ocultar' : 'Ver'} precios por fracción
                                      <ChevronDown size={11} className={`transition-transform ${fraccionesAbiertas.has(a.prod.id) ? 'rotate-180' : ''}`}/>
                                    </button>
                                  )}
                                  {esDivisible && fraccionesAbiertas.has(a.prod.id) && divisiones.map(d => (
                                    <div key={d.nombre}>
                                      <p className="text-[9px] font-semibold text-slate-400 mb-0.5">{d.nombre} <span className="text-slate-300 font-normal">(×{d.cantidad})</span></p>
                                      <div className="flex gap-1">
                                        {[{ l:'Mayor', v: d.precio_mayor }, { l:'S/Fact.', v: d.precio_sin_factura }, { l:'C/Fact.', v: d.precio_facturado }].map(({ l, v }) => (
                                          <button key={l} onClick={() => agregarItem(a.prod, v, d)}
                                            className="flex-1 py-1 px-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-[10px] font-bold transition-all border border-blue-200 hover:border-blue-600">
                                            {l}<br/>Bs.{(parseFloat(v)||0).toFixed(2)}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (() => {
                        const divisiones = base.divisiones || []
                        const esDivisible = base.permite_dividir && divisiones.length > 0
                        return (
                          <div>
                            {esDivisible && (
                              <p className="text-[10px] text-blue-500 mb-1">{parseFloat(base.stock_fraccion_actual || 0).toFixed(2)} sueltos disponibles</p>
                            )}
                            <div className="flex flex-col gap-1.5">
                              {parseFloat(base.stock || 0) > 0 && (
                                <div className="flex gap-1.5 flex-wrap">
                                  {[{ l:'Mayor', v: base.precio_mayor }, { l:'S/Fact.', v: base.precio_sin_factura }, { l:'C/Fact.', v: base.precio_facturado }].map(({ l, v }) => (
                                    <button key={l} onClick={() => agregarItem(base, v)}
                                      className="flex-1 py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold transition-all border border-blue-100 hover:border-blue-600">
                                      {l}<br/>Bs.{(parseFloat(v)||0).toFixed(2)}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {esDivisible && (
                                <button type="button" onClick={() => toggleFracciones(base.id)}
                                  className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 self-start">
                                  <Layers size={11}/> {fraccionesAbiertas.has(base.id) ? 'Ocultar' : 'Ver'} precios por fracción
                                  <ChevronDown size={11} className={`transition-transform ${fraccionesAbiertas.has(base.id) ? 'rotate-180' : ''}`}/>
                                </button>
                              )}
                              {esDivisible && fraccionesAbiertas.has(base.id) && divisiones.map(d => (
                                <div key={d.nombre}>
                                  <p className="text-[9px] font-semibold text-slate-400 mb-0.5">{d.nombre} <span className="text-slate-300 font-normal">(×{d.cantidad})</span></p>
                                  <div className="flex gap-1">
                                    {[{ l:'Mayor', v: d.precio_mayor }, { l:'S/Fact.', v: d.precio_sin_factura }, { l:'C/Fact.', v: d.precio_facturado }].map(({ l, v }) => (
                                      <button key={l} onClick={() => agregarItem(base, v, d)}
                                        className="flex-1 py-1 px-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-[10px] font-bold transition-all border border-blue-200 hover:border-blue-600">
                                        {l}<br/>Bs.{(parseFloat(v)||0).toFixed(2)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-700 shrink-0">
                Productos ({items.length}) — Terminal {terminal}
              </p>
              {items.length > 0 && (
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 bg-white flex-1 max-w-xs">
                    <Search size={13} className="text-slate-400 shrink-0"/>
                    <input
                      className="flex-1 py-1 text-xs bg-transparent outline-none placeholder:text-slate-400"
                      placeholder="Buscar en seleccionados..."
                      value={terminalSearch}
                      onChange={e => setTerminalSearch(e.target.value)}
                    />
                    {terminalSearch && <button onClick={() => setTerminalSearch('')} className="text-slate-300 hover:text-slate-500"><X size={11}/></button>}
                  </div>
                  {/* Imprimir */}
                  <div className="relative">
                    <button onClick={() => setMenuImprimir(m => !m)}
                      className="btn btn-ghost btn-sm text-slate-500 hover:text-slate-700 border border-slate-200 px-2">
                      🖨 Imprimir
                    </button>
                    {menuImprimir && (
                      <div className="absolute right-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[170px]">
                        <button onClick={() => { imprimir('normal'); setMenuImprimir(false) }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
                          🖨 Impresora Normal (A4)
                        </button>
                        <button onClick={() => { imprimir('termica'); setMenuImprimir(false) }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
                          🧾 Impresora Térmica (80mm)
                        </button>
                      </div>
                    )}
                  </div>
                  <button onClick={limpiar} className="btn btn-ghost btn-sm text-red-400 hover:text-red-600 shrink-0"><Trash2 size={13}/></button>
                </div>
              )}
            </div>
            {items.length === 0 && !deudaEnCobro ? (
              <div className="p-12 text-center text-slate-400"><Search size={32} className="mx-auto mb-2 opacity-30"/><p className="text-sm">Busca y agrega productos</p></div>
            ) : (
              <>
                {items.length > 0 && (
                  <table>
                    <thead><tr><th className="w-6 text-center text-slate-400">#</th><th></th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th><th></th></tr></thead>
                    <tbody>{items.filter(item => !terminalSearch || item.nombre_producto.toLowerCase().includes(terminalSearch.toLowerCase())).map((item, idx) => (
                      <tr key={item.producto_id}>
                        <td className="text-center text-xs text-slate-400 font-mono pr-1 w-6">{items.indexOf(item)+1}</td>
                        <td className="w-12 pr-0">
                          {item.foto
                            ? <img src={item.foto} alt="" className="w-10 h-10 rounded-lg object-cover"/>
                            : <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Package size={16} className="text-slate-300"/></div>
                          }
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <div>
                              <p className="font-medium text-sm">{item.nombre_producto}</p>
                              {item.division_nombre
                                ? <span className="inline-block text-[10px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded">{item.division_nombre}</span>
                                : <p className="text-xs text-slate-400">{item.unidad}</p>
                              }
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {item.almacen_nombre && (
                                  <span className="text-[10px] text-slate-400 font-medium">{item.almacen_nombre}</span>
                                )}
                                {tiendas.length > 1 && (
                                  <button onClick={() => setModalCambioDeposito(item)}
                                    className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold underline underline-offset-2">
                                    cambiar
                                  </button>
                                )}
                              </div>
                            </div>
                            {item.precio_compra > 0 && (
                              <button onClick={() => setModalPrecioCompra(item)} className="ml-1 text-slate-300 hover:text-blue-500 shrink-0" title="Ver precio de compra">
                                <Eye size={14}/>
                              </button>
                            )}
                          </div>
                        </td>
                        <td><div className="flex items-center gap-1">
                          <button onClick={() => cambiarCantidad(item._itemKey,-1)} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={12}/></button>
                          <span className="w-10 text-center text-sm font-semibold">{item.cantidad}</span>
                          <button onClick={() => cambiarCantidad(item._itemKey,1)} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus size={12}/></button>
                        </div></td>
                        <td>
                          <input type="number" className="inp w-24 text-sm py-1" value={item.precio_unitario} onChange={e => cambiarPrecio(item._itemKey,e.target.value)} step="0.01" min="0"/>
                          {item.precio_modificado && (
                            <div className="flex items-center gap-0.5 mt-0.5 text-amber-600">
                              <AlertTriangle size={10}/><span className="text-[10px] font-semibold">Precio modificado</span>
                            </div>
                          )}
                        </td>
                        <td className="font-bold text-slate-800">Bs. {(parseFloat(item.subtotal)||0).toFixed(2)}</td>
                        <td><button onClick={() => quitarItem(item._itemKey)} className="text-red-400 hover:text-red-600"><Trash2 size={15}/></button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}

                {/* Sección deuda en cobro */}
                {deudaEnCobro && (
                  <div className="border-t-2 border-dashed border-amber-300 bg-amber-50">
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-500 shrink-0"/>
                        <div>
                          <p className="text-xs font-bold text-amber-800">Deuda Pendiente</p>
                          <p className="text-[10px] text-amber-500">{new Date(deudaEnCobro.prestamos[0]?.fecha||deudaEnCobro.prestamos[0]?.created_at).toLocaleDateString('es-BO', { day:'2-digit', month:'long', year:'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-red-600">Bs. {(deudaEnCobro.montoPagar ?? deudaEnCobro.total).toFixed(2)}</span>
                        <button onClick={() => setDeudaEnCobro(null)} className="text-amber-400 hover:text-amber-600"><X size={13}/></button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Panel cobro */}
        <div className="flex flex-col gap-4">
          <div className="card p-4 flex flex-col gap-3">
            <h2 className="font-bold text-slate-700">Cobro — Terminal {terminal}</h2>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="lbl mb-0">Cliente (opcional)</label>
                <div className="flex items-center gap-1">
                  {clienteId && clienteHistorial.length > 0 && (
                    <button onClick={() => setModalHistorial(true)}
                      className="btn btn-ghost btn-sm py-0.5 px-2 text-violet-600 border-violet-200 hover:bg-violet-50">
                      <Package size={13}/> {loadingHistorial ? '...' : `${clienteHistorial.length} productos`}
                    </button>
                  )}
                  <button onClick={() => setModalCliente(true)} className="btn btn-ghost btn-sm py-0.5 px-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                    <UserPlus size={13}/> Nuevo
                  </button>
                </div>
              </div>
              <div className="relative" ref={clienteRef}>
                <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                  <Search size={14} className="text-slate-400 shrink-0"/>
                  <input
                    className="flex-1 py-2 text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
                    placeholder="Buscar cliente..."
                    value={clienteSearch}
                    onChange={e => {
                      setClienteSearch(e.target.value)
                      setClienteOpen(true)
                      if (!e.target.value) setCart(p => ({ ...p, clienteId: '' }))
                    }}
                    onFocus={() => setClienteOpen(true)}
                  />
                  {clienteId && (
                    <button onClick={() => { setClienteSearch(''); setCart(p=>({...p,clienteId:'',montosPago:{...p.montosPago,fiado:''}})); setClienteOpen(false) }}
                      className="text-slate-400 hover:text-slate-600 shrink-0"><X size={13}/></button>
                  )}
                </div>
                {clienteOpen && (
                  <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    <div
                      className="px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 cursor-pointer"
                      onMouseDown={() => { setCart(p=>({...p,clienteId:''})); setClienteSearch(''); setClienteOpen(false) }}>
                      Sin cliente
                    </div>
                    {clientes
                      .filter(c => !clienteSearch || c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || (c.telefono||'').includes(clienteSearch))
                      .map(c => (
                        <div key={c.id}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between ${String(c.id)===String(clienteId)?'bg-blue-50 text-blue-700 font-semibold':''}`}
                          onMouseDown={() => { setCart(p=>({...p,clienteId:String(c.id)})); setClienteSearch(c.nombre); setClienteOpen(false) }}>
                          <span>{c.nombre}{c.telefono ? <span className="text-slate-400 font-normal"> · {c.telefono}</span> : ''}</span>
                          {parseFloat(c.saldo_pendiente||0) > 0 && <span className="text-xs text-red-500 font-bold ml-2 shrink-0">⚠ Bs.{parseFloat(c.saldo_pendiente).toFixed(2)}</span>}
                        </div>
                    ))}
                    {clientes.filter(c => !clienteSearch || c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || (c.telefono||'').includes(clienteSearch)).length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-400">Sin resultados</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="lbl">Descuento</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs shrink-0">Bs.</span>
                <input className="inp flex-1" type="number" value={descuento} onChange={e => setCart(p=>({...p,descuento:e.target.value}))} min="0" step="0.01" placeholder="0.00"/>
              </div>
            </div>

            <div>
              <label className="lbl mb-2">Formas de pago</label>
              <div className="flex flex-col gap-2">
                {METODOS_PAGO.map(m => {
                  const esFiado = m.id === 'fiado'
                  const sinCliente = esFiado && !clienteId
                  return (
                    <div key={m.id} className={`flex items-center gap-2 ${sinCliente ? 'opacity-40' : ''}`}>
                      <span className={`text-xs font-bold w-20 shrink-0 ${parseFloat(montosPago[m.id])>0?'text-blue-700':'text-slate-500'}`}>
                        {m.label}
                        {esFiado && !clienteId && <span className="block text-[9px] font-normal text-red-400 leading-tight">Requiere cliente</span>}
                      </span>
                      <span className="text-slate-400 text-xs shrink-0">Bs.</span>
                      <input
                        type="number" min="0" step="0.01"
                        className="inp flex-1 py-1.5 text-sm"
                        value={montosPago[m.id]}
                        disabled={sinCliente}
                        readOnly={esFiado}
                        title={esFiado ? 'Se calcula automáticamente' : ''}
                        onChange={e => !esFiado && setCart(p=>({...p, montosPago:{ ...p.montosPago, [m.id]: e.target.value }}))}
                        placeholder="0.00"
                        style={esFiado ? { background: '#f8fafc', cursor: 'default' } : {}}
                      />
                    </div>
                  )
                })}
              </div>
              {!clienteId && (parseFloat(montosPago.efectivo)||0) + (parseFloat(montosPago.pago_banco)||0) < totalACobrar && totalACobrar > 0 && (
                <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 rounded px-2 py-1">
                  ⚠ Para registrar fiado debes seleccionar un cliente
                </p>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>Bs. {subtotal.toFixed(2)}</span></div>
              {montoDesc > 0 && <div className="flex justify-between text-emerald-600"><span>Descuento</span><span>- Bs. {montoDesc.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base text-slate-800 border-t border-slate-200 pt-1.5 mt-1"><span>Venta</span><span>Bs. {total.toFixed(2)}</span></div>
              {deudaCobrar > 0 && <div className="flex justify-between text-amber-600 font-semibold"><span>Deuda anterior</span><span>+ Bs. {deudaCobrar.toFixed(2)}</span></div>}
              {deudaCobrar > 0 && <div className="flex justify-between font-bold text-lg text-slate-800 border-t border-slate-200 pt-1.5 mt-0.5"><span>TOTAL A COBRAR</span><span>Bs. {totalACobrar.toFixed(2)}</span></div>}
              {deudaCobrar === 0 && <div className="flex justify-between font-bold text-lg text-slate-800"><span>TOTAL</span><span>Bs. {total.toFixed(2)}</span></div>}
              {METODOS_PAGO.filter(m => parseFloat(montosPago[m.id]) > 0 && !(m.id === 'fiado' && !clienteId)).map(m => (
                <div key={m.id} className="flex justify-between text-blue-600 text-xs"><span>{m.label}</span><span>Bs. {parseFloat(montosPago[m.id]).toFixed(2)}</span></div>
              ))}
              {totalPagado > 0 && <div className="flex justify-between font-semibold text-blue-700 border-t border-slate-200 pt-1.5 mt-0.5"><span>Total pagado</span><span>Bs. {totalPagado.toFixed(2)}</span></div>}
              {vuelto > 0 && <div className="flex justify-between text-emerald-600 font-semibold"><span>Cambio</span><span>Bs. {vuelto.toFixed(2)}</span></div>}
              {falta > 0 && !clienteId && <div className="flex justify-between text-red-500 font-bold"><span>Falta</span><span>Bs. {falta.toFixed(2)}</span></div>}
              {falta > 0 && clienteId && parseFloat(montosPago.fiado) > 0 && <div className="flex justify-between text-amber-600 font-semibold"><span>Fiado</span><span>Bs. {parseFloat(montosPago.fiado).toFixed(2)}</span></div>}
            </div>

            <div>
              <label className="lbl">Notas</label>
              <textarea className="inp" rows={2} value={notas} onChange={e => setCart(p=>({...p,notas:e.target.value}))} placeholder="Observaciones..."/>
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg p-2">{error}</p>}
            {falta > 0 && !clienteId && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 text-center font-semibold">
                Selecciona un cliente para registrar el fiado o cubre el total
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { if(!items.length){ setError('Agrega al menos un producto'); return; } setError(''); setDestinoVenta('cajero'); setModalConfirmar(true) }}
                disabled={!items.length}
                className="btn btn-success flex-1 justify-center py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                <Check size={16}/> Enviar al Cajero
              </button>
              <button
                onClick={() => { if(!items.length){ setError('Agrega al menos un producto'); return; } setError(''); setDestinoVenta('directo'); setModalConfirmar(true) }}
                disabled={saving || !items.length || (falta > 0 && !clienteId)}
                className="btn btn-primary flex-1 justify-center py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                <Check size={16}/> Cobrar Ahora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal deuda pendiente del cliente */}
      {modalDeuda && !deudaEnCobro && (
        <div className="modal-overlay">
          <div className="modal max-w-md w-full rounded-lg">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <AlertCircle size={20} className="text-amber-500 shrink-0"/>
              <div>
                <h2 className="font-bold text-slate-800">Este cliente tiene una deuda pendiente</h2>
                <p className="text-xs text-slate-400">¿Deseas incluir el cobro en esta venta?</p>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Info deuda */}
              {modalDeuda.prestamos.map(p => (
                <div key={p.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-800">Deuda Pendiente</p>
                      <p className="text-xs text-slate-400">Desde el {new Date(p.fecha||p.created_at).toLocaleDateString('es-BO', { day:'2-digit', month:'long', year:'numeric' })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total original: Bs. {parseFloat(p.total||0).toFixed(2)}</p>
                      <p className="text-lg font-bold text-red-600">Debe: Bs. {parseFloat(p.saldo||0).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Historial de pagos */}
                  {p.pagos && p.pagos.length > 0 && (
                    <div className="bg-emerald-50 rounded-xl px-4 py-2 flex flex-col gap-1">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">Historial de pagos</p>
                      {p.pagos.map((pago, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-slate-500">{new Date(pago.fecha||pago.created_at).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' })}</span>
                          <span className="font-semibold text-emerald-700">+ Bs. {parseFloat(pago.monto||0).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-bold border-t border-emerald-200 pt-1 mt-0.5">
                        <span className="text-emerald-600">Total pagado</span>
                        <span className="text-emerald-700">Bs. {parseFloat(p.pagado||0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Input cuánto pagar */}
              <div>
                <label className="lbl">¿Cuánto desea pagar ahora? (Bs.)</label>
                <input className="inp text-xl font-bold" type="number" min="0.01" step="0.01"
                  max={modalDeuda.total}
                  value={montoPagarDeuda}
                  onChange={e => setMontoPagarDeuda(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1">Deuda total: Bs. {modalDeuda.total.toFixed(2)}</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setModalDeuda(null)} className="btn btn-ghost flex-1">Por el momento no</button>
                <button onClick={() => {
                  const monto = parseFloat(montoPagarDeuda) || modalDeuda.total
                  setDeudaEnCobro({ ...modalDeuda, montoPagar: monto })
                  setModalDeuda(null)
                  // sumar al efectivo ya ingresado
                  setCart(p => ({ ...p, montosPago: { ...p.montosPago, efectivo: ((parseFloat(p.montosPago.efectivo)||0) + monto).toFixed(2) } }))
                }} className="btn btn-primary flex-1 justify-center">
                  <Check size={15}/> Agregar al cobro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal historial productos del cliente */}
      {modalHistorial && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalHistorial(false)}>
          <div className="modal max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800">Productos de {clienteSearch}</h2>
                <p className="text-xs text-slate-400">Precios de la última compra — click para añadir a la venta</p>
              </div>
              <button onClick={() => setModalHistorial(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <div className="px-4 pt-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                <Search size={14} className="text-slate-400 shrink-0"/>
                <input
                  className="flex-1 py-2 text-sm bg-transparent outline-none placeholder:text-slate-400"
                  placeholder="Buscar producto..."
                  autoFocus
                  id="historial-search"
                  onChange={e => {
                    const q = e.target.value.toLowerCase()
                    document.querySelectorAll('[data-historial-item]').forEach(el => {
                      el.style.display = el.dataset.nombre.toLowerCase().includes(q) ? '' : 'none'
                    })
                  }}
                />
              </div>
            </div>
            <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
              {clienteHistorial.map((item, i) => (
                <div key={i} data-historial-item data-nombre={item.nombre_producto} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Package size={14} className="text-slate-300 shrink-0"/>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.nombre_producto}</p>
                      <p className="text-xs text-slate-400 mb-1">{item.unidad} · {new Date(item.fecha).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' })}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(item.almacenes||[]).map(a => (
                          <span key={a.tienda_id} className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${a.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {a.nombre}: {a.stock} {item.unidad}
                          </span>
                        ))}
                        {(item.almacenes||[]).length === 0 && (
                          <span className="text-[10px] text-slate-400">Sin stock registrado</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-slate-700">Bs. {parseFloat(item.precio_unitario||0).toFixed(2)}</span>
                    <button
                      onClick={() => {
                        agregarItem(
                          { id: item.producto_id, nombre: item.nombre_producto, unidad: item.unidad || 'Unidad' },
                          item.precio_unitario
                        )
                        setModalHistorial(false)
                      }}
                      className="btn btn-primary btn-sm py-1 px-3 text-xs">
                      <Plus size={12}/> Añadir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal cambio de depósito */}
      {modalCambioDeposito && (() => {
        const item = modalCambioDeposito
        const q = (item.nombre_producto||'').toLowerCase()
        const opciones = tiendas.map(t => {
          const prod = todosProductos.find(p => p._tiendaId === t.id && p.nombre.toLowerCase() === q)
          return prod ? { tienda: t, prod } : null
        }).filter(Boolean)
        return (
          <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModalCambioDeposito(null)}>
            <div className="modal max-w-sm w-full rounded-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-slate-800">Cambiar Depósito</h2>
                  <p className="text-xs text-slate-400">{item.nombre_producto}</p>
                </div>
                <button onClick={() => setModalCambioDeposito(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {opciones.map(({ tienda, prod }) => {
                  const esCurrent = item.almacen_id === tienda.id
                  const sinStock = parseFloat(prod.stock||0) <= 0
                  return (
                    <button key={tienda.id}
                      disabled={esCurrent}
                      onClick={() => {
                        setCart(prev => ({
                          ...prev,
                          items: prev.items.map(i => {
                            if (i.producto_id !== item.producto_id) return i
                            return {
                              ...i,
                              producto_id: prod.id,
                              almacen_id: tienda.id,
                              almacen_nombre: tienda.nombre,
                              foto: prod.foto || '',
                              precio_compra: parseFloat(prod.precio_compra||0),
                              precio_original: parseFloat(prod.precio_sin_factura||prod.precio_mayor||0),
                            }
                          })
                        }))
                        setModalCambioDeposito(null)
                      }}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all text-left
                        ${esCurrent ? 'bg-blue-50 border-blue-300 cursor-default' : sinStock ? 'border-slate-100 opacity-50 cursor-not-allowed' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                      <div>
                        <p className="font-semibold text-slate-800">{tienda.nombre}</p>
                        <p className={`text-xs font-medium mt-0.5 ${sinStock ? 'text-red-400' : 'text-emerald-600'}`}>
                          Stock: {prod.stock} {item.unidad}
                        </p>
                      </div>
                      {esCurrent && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Actual</span>}
                      {!esCurrent && !sinStock && <span className="text-[10px] text-slate-400">Seleccionar →</span>}
                      {sinStock && <span className="text-[10px] text-red-400">Sin stock</span>}
                    </button>
                  )
                })}
                {opciones.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Este producto no está en otros depósitos</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal confirmación */}
      {modalConfirmar && (
        <div className="modal-overlay">
          <div className="modal max-w-sm w-full rounded-2xl">
            <div className="px-6 py-5 text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${destinoVenta==='directo'?'bg-blue-100':'bg-emerald-100'}`}>
                <Check size={28} className={destinoVenta==='directo'?'text-blue-600':'text-emerald-600'}/>
              </div>
              <h2 className="font-bold text-slate-800 text-lg mb-1">
                {destinoVenta==='directo' ? '¿Cobrar ahora?' : '¿Enviar al cajero?'}
              </h2>
              <p className="text-sm text-slate-500 mb-1">{items.length} producto{items.length!==1?'s':''} · Total: <strong className="text-slate-800">Bs. {total.toFixed(2)}</strong></p>
              {clienteId && <p className="text-xs text-blue-600 mb-1">Cliente: {clienteSearch}</p>}
              {!clienteId && <p className="text-xs text-slate-400 mb-1">Sin cliente asignado</p>}
              <p className="text-xs text-slate-400 mb-4">
                {destinoVenta==='directo' ? 'La venta se registra inmediatamente.' : 'La nota pasa al cajero para el cobro.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setModalConfirmar(false)} className="btn btn-ghost flex-1" disabled={saving}>Cancelar</button>
                <button onClick={() => { setModalConfirmar(false); if(destinoVenta==='directo') handleSave(); else handleEnviarAlCajero() }} disabled={saving}
                  className={`flex-1 justify-center btn ${destinoVenta==='directo'?'btn-primary':'btn-success'}`}>
                  <Check size={15}/> {saving ? 'Guardando...' : 'Sí, confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal precio de compra */}
      {modalPrecioCompra && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModalPrecioCompra(null)}>
          <div className="modal max-w-xs w-full rounded-2xl">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800">Precio de Compra</h2>
                <button onClick={() => setModalPrecioCompra(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                {modalPrecioCompra.foto
                  ? <img src={modalPrecioCompra.foto} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-100"/>
                  : <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center"><Package size={22} className="text-slate-300"/></div>
                }
                <div>
                  <p className="font-semibold text-slate-800">{modalPrecioCompra.nombre_producto}</p>
                  <p className="text-xs text-slate-400">{modalPrecioCompra.unidad}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Precio de compra</span><span className="font-bold text-slate-800">Bs. {modalPrecioCompra.precio_compra.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Precio de venta</span><span className="font-semibold text-blue-700">Bs. {parseFloat(modalPrecioCompra.precio_unitario).toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
                  <span className="text-slate-500">Margen</span>
                  <span className={`font-bold ${(modalPrecioCompra.precio_unitario - modalPrecioCompra.precio_compra) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    Bs. {(parseFloat(modalPrecioCompra.precio_unitario) - modalPrecioCompra.precio_compra).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear cliente */}
      {modalCliente && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModalCliente(false)}>
          <div className="modal max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Nuevo Cliente</h2>
              <button onClick={() => setModalCliente(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <div><label className="lbl">Nombre *</label>
                <input className="inp" value={formCliente.nombre} onChange={e => setFormCliente(f=>({...f,nombre:e.target.value}))} placeholder="Nombre completo" autoFocus/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="lbl">Teléfono</label><input className="inp" value={formCliente.telefono} onChange={e => setFormCliente(f=>({...f,telefono:e.target.value}))} placeholder="Ej: 76012345"/></div>
                <div><label className="lbl">Correo</label><input className="inp" type="email" value={formCliente.correo} onChange={e => setFormCliente(f=>({...f,correo:e.target.value}))} placeholder="email@ejemplo.com"/></div>
              </div>
              <div><label className="lbl">Dirección</label><input className="inp" value={formCliente.direccion} onChange={e => setFormCliente(f=>({...f,direccion:e.target.value}))} placeholder="Dirección"/></div>
              <div><label className="lbl">Ciudad / Provincia</label><input className="inp" value={formCliente.ciudad} onChange={e => setFormCliente(f=>({...f,ciudad:e.target.value}))} placeholder="Ej: Santa Cruz, Cochabamba..."/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="lbl">Empresa / Razón social</label><input className="inp" value={formCliente.empresa} onChange={e => setFormCliente(f=>({...f,empresa:e.target.value}))} placeholder="Nombre empresa"/></div>
                <div><label className="lbl">NIT</label><input className="inp" value={formCliente.nit} onChange={e => setFormCliente(f=>({...f,nit:e.target.value}))} placeholder="Ej: 123456789"/></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setModalCliente(false)} className="btn btn-ghost flex-1">Cancelar</button>
                <button onClick={guardarCliente} disabled={savingCliente || !formCliente.nombre.trim()} className="btn btn-primary flex-1 justify-center">
                  <Check size={16}/> {savingCliente ? 'Guardando...' : 'Crear cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
