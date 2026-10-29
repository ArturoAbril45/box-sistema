import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { ArrowRightLeft, Check, Package, Search, Plus, Trash2, X, AlertTriangle, History } from 'lucide-react'

export default function Traspasos() {
  const { user, tiendaActual } = useAuth()
  const [todosProductos, setTodosProductos] = useState([]) // productos de TODOS los almacenes, con _tiendaId/_tiendaNombre
  const [search, setSearch]                 = useState('')
  const [carrito, setCarrito]               = useState([]) // [{producto_id, nombre, foto, stock, cantidad, origen_id, origen_nombre, destino_id}]
  const [motivo, setMotivo]                 = useState('')
  const [vendedores, setVendedores]         = useState([])
  const [distribuidorId, setDistribuidorId] = useState('')
  const [traspasos, setTraspasos]           = useState([])
  const [loading, setLoading]               = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')
  const [ok, setOk]                         = useState('')
  const [showConfirm, setShowConfirm]       = useState(false)
  const [loteADeshacer, setLoteADeshacer]   = useState(null) // { key, items }
  const hoy = new Date().toISOString().slice(0, 10)
  const [desdeFiltro, setDesdeFiltro]       = useState(hoy.slice(0, 8) + '01')
  const [hastaFiltro, setHastaFiltro]       = useState(hoy)
  const [productoFiltro, setProductoFiltro] = useState('')

  const [tiendas, setTiendas] = useState([]) // TODAS las tiendas (sucursales + depósitos): pueden ser origen o destino

  useEffect(() => {
    api.getTiendas().then(ts => setTiendas([...ts].sort((a,b) => a.id - b.id)))
  }, [])
  useEffect(() => { cargarTraspasos() }, [])
  useEffect(() => { api.getUsuarios().then(us => setVendedores(us.filter(u => u.rol === 'vendedor'))) }, [])

  useEffect(() => { recargarProductos() }, [tiendas])

  function cargarTraspasos(desde = desdeFiltro, hasta = hastaFiltro) {
    setLoading(true)
    api.getTraspasos({ desde, hasta }).then(setTraspasos).finally(() => setLoading(false))
  }

  async function eliminarTraspaso(t) {
    if (!confirm(`¿Deshacer el traspaso de "${t.producto_nombre}"? El stock regresará a ${t.almacen_origen_nombre}.`)) return
    setError('')
    try {
      await api.deleteTraspaso(t.id)
      cargarTraspasos()
      recargarProductos()
    } catch (e) { setError(e.message) }
  }

  async function confirmarDeshacerLote() {
    if (!loteADeshacer) return
    setError('')
    try {
      const { key, items } = loteADeshacer
      if (key.startsWith('single-')) await api.deleteTraspaso(items[0].id)
      else await api.deleteTraspasoLote(key)
      setLoteADeshacer(null)
      cargarTraspasos()
      recargarProductos()
    } catch (e) { setError(e.message) }
  }

  // Agrupar el historial por envío (lote_id); los traspasos antiguos sin lote quedan cada uno en su propio grupo
  const lotesHistorial = (() => {
    const q = productoFiltro.trim().toLowerCase()
    const filtrados = q ? traspasos.filter(t => t.producto_nombre.toLowerCase().includes(q)) : traspasos
    const grupos = {}
    const orden = []
    filtrados.forEach(t => {
      const key = t.lote_id || `single-${t.id}`
      if (!grupos[key]) { grupos[key] = []; orden.push(key) }
      grupos[key].push(t)
    })
    return orden.map(key => ({ key, items: grupos[key] }))
  })()

  function recargarProductos() {
    if (!tiendas.length) return
    Promise.all(
      tiendas.map(s => api.getProductos({ tienda_id: s.id }).then(ps => ps.map(p => ({ ...p, _tiendaId: s.id, _tiendaNombre: s.nombre }))).catch(() => []))
    ).then(results => setTodosProductos(results.flat()))
  }

  // Agrupar por nombre/código, mostrando el stock disponible en cada almacén
  const filtrados = (() => {
    if (search.trim().length < 1) return []
    const q = search.toLowerCase()
    const matches = todosProductos.filter(p =>
      p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q)
    )
    const grupos = {}
    matches.forEach(p => {
      const key = p.codigo || p.nombre
      if (!grupos[key]) grupos[key] = { base: p, almacenes: [] }
      grupos[key].almacenes.push(p)
    })
    return Object.values(grupos)
  })()

  function agregarAlCarrito(p) {
    setError('')
    if (carrito.some(c => c.producto_id === p.id)) return
    setCarrito(c => [...c, {
      producto_id: p.id, nombre: p.nombre, foto: p.foto, stock: parseFloat(p.stock), cantidad: 1,
      origen_id: p._tiendaId, origen_nombre: p._tiendaNombre, destino_id: '',
    }])
    setSearch('')
  }

  function quitarDelCarrito(producto_id) {
    setCarrito(c => c.filter(i => i.producto_id !== producto_id))
  }

  function setCantidad(producto_id, cantidad) {
    setCarrito(c => c.map(i => i.producto_id === producto_id ? { ...i, cantidad } : i))
  }

  function setDestino(producto_id, destino_id) {
    setCarrito(c => c.map(i => i.producto_id === producto_id ? { ...i, destino_id } : i))
  }

  function validar() {
    if (carrito.length === 0) return 'Agrega al menos un producto a la lista'
    for (const item of carrito) {
      if (!item.destino_id) return `Elige a qué almacén se traspasa "${item.nombre}"`
      if (String(item.destino_id) === String(item.origen_id)) return `"${item.nombre}": el origen y el destino no pueden ser el mismo almacén`
      if (!item.cantidad || Number(item.cantidad) <= 0) return `Ingresa una cantidad válida para "${item.nombre}"`
      if (Number(item.cantidad) > item.stock) return `No hay stock suficiente de "${item.nombre}"`
    }
    return ''
  }

  function abrirConfirmacion() {
    const err = validar()
    if (err) { setError(err); return }
    setError('')
    setShowConfirm(true)
  }

  async function confirmarTraspaso() {
    setSaving(true); setError(''); setOk('')
    try {
      await api.addTraspaso({
        motivo,
        distribuidor_id: distribuidorId || null,
        items: carrito.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, almacen_destino_id: i.destino_id })),
      })
      setOk(`${carrito.length} producto(s) traspasado(s) correctamente`)
      setCarrito([]); setMotivo(''); setDistribuidorId(''); setShowConfirm(false)
      recargarProductos()
      cargarTraspasos()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Traspasos de Productos</h1>
      </div>

      <div className="card p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <ArrowRightLeft size={15}/> Nuevo traspaso
        </h2>

        {/* Buscador global de productos (todos los almacenes) */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"/>
          <input
            className="inp !pl-9"
            placeholder="Buscar producto por nombre o código en todos los almacenes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && filtrados.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {filtrados.slice(0, 20).map(entry => {
                const base = entry.base
                return (
                  <div key={base.codigo || base.nombre} className="border-b border-slate-100 last:border-0 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                        {base.foto ? <img src={base.foto} alt="" className="w-full h-full object-cover" /> : <Package size={24} className="text-slate-300"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{base.nombre}</p>
                        <p className="text-xs text-slate-400 mb-1.5">{base.codigo}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.almacenes.map(a => {
                            const yaEnCarrito = carrito.some(c => c.producto_id === a.id)
                            return (
                              <button key={a.id} type="button" disabled={yaEnCarrito || parseFloat(a.stock) <= 0}
                                onClick={() => agregarAlCarrito(a)}
                                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border transition-all
                                  ${yaEnCarrito ? 'bg-emerald-50 border-emerald-200 text-emerald-600 cursor-default'
                                    : parseFloat(a.stock) <= 0 ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                                    : 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600'}`}>
                                {yaEnCarrito ? <Check size={11}/> : <Plus size={11}/>}
                                {a._tiendaNombre}: {parseFloat(a.stock).toFixed(2)} {a.unidad}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Lista / carrito: cada producto con su propio origen -> destino */}
        {carrito.length > 0 ? (
          <div className="border border-slate-200 rounded-lg overflow-hidden mt-3">
            <table>
              <thead><tr><th>Producto</th><th>De</th><th></th><th>A</th><th>Cantidad</th><th></th></tr></thead>
              <tbody>
                {carrito.map(item => (
                  <tr key={item.producto_id}>
                    <td>
                      <div className="flex items-center gap-3 py-1">
                        <div className="w-14 h-14 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                          {item.foto ? <img src={item.foto} alt="" className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-300"/>}
                        </div>
                        <div>
                          <p className="font-medium">{item.nombre}</p>
                          <p className="text-xs text-slate-400">Stock disp.: {item.stock.toFixed(2)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-slate-600 font-medium whitespace-nowrap">{item.origen_nombre}</td>
                    <td className="text-slate-300"><ArrowRightLeft size={13}/></td>
                    <td>
                      <select className="inp py-1.5" value={item.destino_id} onChange={e => setDestino(item.producto_id, e.target.value)}>
                        <option value="">Selecciona destino...</option>
                        {tiendas.filter(a => String(a.id) !== String(item.origen_id)).map(a => (
                          <option key={a.id} value={a.id}>{a.nombre} {a.tipo === 'deposito' ? '(Depósito)' : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input type="number" step="0.001" min="0" max={item.stock}
                        className="inp w-24 py-1.5"
                        value={item.cantidad}
                        onChange={e => setCantidad(item.producto_id, e.target.value)} />
                    </td>
                    <td>
                      <button onClick={() => quitarDelCarrito(item.producto_id)} className="btn btn-ghost btn-sm py-1 px-2 text-red-500">
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 mt-3">Busca y agrega productos para armar la lista de traspaso.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="lbl">Distribuidor (quién lo va a llevar)</label>
            <select className="inp" value={distribuidorId} onChange={e => setDistribuidorId(e.target.value)}>
              <option value="">Selecciona un vendedor...</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Descripción / motivo del traspaso (opcional)</label>
            <input className="inp" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Reabastecimiento de sucursal, cierre temporal, etc." />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 rounded p-2 mt-3">{error}</p>}
        {ok && <p className="text-emerald-600 text-sm bg-emerald-50 rounded p-2 mt-3">{ok}</p>}

        <div className="flex justify-end mt-4">
          <button onClick={abrirConfirmacion} disabled={carrito.length === 0} className="btn btn-primary">
            <Check size={16}/> Traspasar {carrito.length > 0 ? `(${carrito.length})` : ''}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <History size={15}/> Historial de traspasos
        </h2>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="lbl">Desde</label>
            <input type="date" className="inp" value={desdeFiltro} onChange={e => setDesdeFiltro(e.target.value)} />
          </div>
          <div>
            <label className="lbl">Hasta</label>
            <input type="date" className="inp" value={hastaFiltro} onChange={e => setHastaFiltro(e.target.value)} />
          </div>
          <div>
            <label className="lbl">Producto</label>
            <input type="text" className="inp" placeholder="Buscar por producto..." value={productoFiltro} onChange={e => setProductoFiltro(e.target.value)} />
          </div>
          <button onClick={cargarTraspasos} className="btn btn-primary">
            <Search size={14}/> Buscar
          </button>
          <button onClick={() => { setDesdeFiltro(hoy); setHastaFiltro(hoy); cargarTraspasos(hoy, hoy) }} className="btn btn-ghost">
            Hoy
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : lotesHistorial.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no hay traspasos registrados.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {lotesHistorial.map(({ key, items }) => {
              const first = items[0]
              return (
                <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 gap-3">
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-slate-600">{new Date(first.fecha).toLocaleString()}</span>
                      <span>Usuario: <span className="text-slate-700 font-medium">{first.usuario_nombre || '-'}</span></span>
                      {first.distribuidor_nombre && <span>Distribuidor: <span className="text-slate-700 font-medium">{first.distribuidor_nombre}</span></span>}
                      {first.motivo && <span>Motivo: <span className="text-slate-700 font-medium">{first.motivo}</span></span>}
                    </div>
                    <button onClick={() => setLoteADeshacer({ key, items })} title="Deshacer envío completo"
                      className="btn btn-ghost btn-sm py-1 px-2 text-red-500 whitespace-nowrap shrink-0">
                      <Trash2 size={13}/> Deshacer envío
                    </button>
                  </div>
                  <table>
                    <thead><tr><th>Producto</th><th>De</th><th></th><th>A</th><th>Cantidad</th><th></th></tr></thead>
                    <tbody>
                      {items.map(t => (
                        <tr key={t.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                                {t.producto_foto ? <img src={t.producto_foto} alt="" className="w-full h-full object-cover" /> : <Package size={16} className="text-slate-300"/>}
                              </div>
                              <span className="font-medium">{t.producto_nombre}</span>
                            </div>
                          </td>
                          <td className="text-slate-600 whitespace-nowrap">{t.almacen_origen_nombre}</td>
                          <td className="text-slate-300"><ArrowRightLeft size={13}/></td>
                          <td className="text-slate-600 whitespace-nowrap">{t.almacen_destino_nombre}</td>
                          <td className="font-semibold">{Number(t.cantidad).toFixed(2)}</td>
                          <td>
                            <button onClick={() => eliminarTraspaso(t)} title="Deshacer este producto" className="btn btn-ghost btn-sm py-1 px-2 text-red-500">
                              <Trash2 size={14}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><AlertTriangle size={17} className="text-amber-500"/> Confirmar traspaso</h2>
              <button onClick={() => setShowConfirm(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">¿Seguro que desea realizar el siguiente traspaso de productos?</p>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 mb-4">
                {carrito.map(item => {
                  const destino = tiendas.find(a => String(a.id) === String(item.destino_id))
                  return (
                    <div key={item.producto_id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                        {item.foto ? <img src={item.foto} alt="" className="w-full h-full object-cover" /> : <Package size={16} className="text-slate-300"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.nombre}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          {item.origen_nombre} <ArrowRightLeft size={10}/> {destino?.nombre}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-slate-800 shrink-0">{Number(item.cantidad).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-slate-500 mb-1">
                <span className="font-semibold">Usuario:</span> {user?.nombre}
              </p>
              {distribuidorId && (
                <p className="text-xs text-slate-500 mb-1">
                  <span className="font-semibold">Distribuidor:</span> {vendedores.find(v => String(v.id) === String(distribuidorId))?.nombre}
                </p>
              )}
              {motivo && <p className="text-xs text-slate-500 mb-4"><span className="font-semibold">Motivo:</span> {motivo}</p>}
              {error && <p className="text-red-500 text-sm bg-red-50 rounded p-2 mb-4">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowConfirm(false)} disabled={saving} className="btn btn-ghost flex-1 justify-center">Cancelar</button>
                <button onClick={confirmarTraspaso} disabled={saving} className="btn btn-primary flex-1 justify-center">
                  <Check size={16}/> {saving ? 'Traspasando...' : 'Sí, traspasar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación: deshacer envío completo */}
      {loteADeshacer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setLoteADeshacer(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><AlertTriangle size={17} className="text-amber-500"/> Deshacer envío</h2>
              <button onClick={() => setLoteADeshacer(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">¿Seguro que desea deshacer el envío? El stock de estos productos regresará a su almacén de origen.</p>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 mb-4">
                {loteADeshacer.items.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                      {t.producto_foto ? <img src={t.producto_foto} alt="" className="w-full h-full object-cover" /> : <Package size={16} className="text-slate-300"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.producto_nombre}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        {t.almacen_origen_nombre} <ArrowRightLeft size={10}/> {t.almacen_destino_nombre}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-800 shrink-0">{Number(t.cantidad).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 rounded p-2 mb-4">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setLoteADeshacer(null)} className="btn btn-ghost flex-1 justify-center">Cancelar</button>
                <button onClick={confirmarDeshacerLote} className="btn btn-primary flex-1 justify-center">
                  <Check size={16}/> Sí, deshacer envío
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
