import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Search, Plus, Minus, Trash2, Check, X } from 'lucide-react'

export default function NuevaCompra() {
  const { tiendaActual } = useAuth()
  const navigate = useNavigate()
  const searchRef = useRef()

  const [productos, setProductos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [tiendas, setTiendas]     = useState([])
  const [search, setSearch]       = useState('')
  const [items, setItems]         = useState([])
  const [proveedorId, setProveedorId] = useState('')
  const [notas, setNotas]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [montosPago, setMontosPago] = useState({ caja_chica:0, caja_grande:0, billetera_jonny:0, banco:0 })

  useEffect(() => {
    if (!tiendaActual) return
    api.getProductos({ tienda_id: tiendaActual }).then(setProductos)
    api.getProveedores({ tienda_id: tiendaActual }).then(setProveedores)
    api.getTiendas().then(setTiendas)
  }, [tiendaActual])

  const filtrados = productos.filter(p => search.length > 1 && p.nombre.toLowerCase().includes(search.toLowerCase()))

  function agregarItem(prod) {
    setItems(prev => {
      const ex = prev.find(i => i.producto_id === prod.id)
      if (ex) return prev.map(i => i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario, distribucion: [{ tienda_id: tiendaActual, cantidad: i.cantidad + 1 }] } : i)
      const pc = parseFloat(prod.precio_compra) || 0
      return [...prev, {
        producto_id: prod.id, nombre_producto: prod.nombre, cantidad: 1,
        unidad: prod.unidad || 'Unidad', precio_unitario: pc,
        subtotal: pc,
        precio_mayor:       parseFloat(prod.precio_mayor)       || 0,
        precio_facturado:   parseFloat(prod.precio_facturado)   || 0,
        precio_sin_factura: parseFloat(prod.precio_sin_factura) || 0,
        stock_minimo:       parseFloat(prod.stock_minimo)       || 0,
        stock_maximo:       parseFloat(prod.stock_maximo)       || 0,
        distribucion: [{ tienda_id: tiendaActual, cantidad: 1 }],
        mostrarDistribucion: false,
      }]
    })
    setSearch('')
  }

  function actualizarDistribucion(pid, idx, campo, valor) {
    setItems(prev => prev.map(i => {
      if (i.producto_id !== pid) return i
      const dist = i.distribucion.map((d, j) => j !== idx ? d : { ...d, [campo]: campo === 'cantidad' ? (parseFloat(valor) || 0) : Number(valor) })
      // Con una sola fila de distribucion, esa cantidad ES la cantidad total del item —
      // se sincroniza sola para no tener que cambiar el mismo numero en dos lugares.
      if (campo === 'cantidad' && dist.length === 1) {
        const nueva = dist[0].cantidad
        return { ...i, distribucion: dist, cantidad: nueva, subtotal: nueva * i.precio_unitario }
      }
      return { ...i, distribucion: dist }
    }))
  }

  function agregarFilaDistribucion(pid) {
    setItems(prev => prev.map(i => {
      if (i.producto_id !== pid) return i
      const asignado = i.distribucion.reduce((s, d) => s + d.cantidad, 0)
      const restante = Math.max(0, i.cantidad - asignado)
      const usados = new Set(i.distribucion.map(d => d.tienda_id))
      const siguienteTienda = tiendas.find(t => !usados.has(t.id))?.id || tiendaActual
      return { ...i, distribucion: [...i.distribucion, { tienda_id: siguienteTienda, cantidad: restante }] }
    }))
  }

  function quitarFilaDistribucion(pid, idx) {
    setItems(prev => prev.map(i => i.producto_id !== pid ? i : { ...i, distribucion: i.distribucion.filter((_, j) => j !== idx) }))
  }

  function cambiarCampo(pid, campo, val) {
    setItems(prev => prev.map(i => i.producto_id !== pid ? i : { ...i, [campo]: parseFloat(val)||0 }))
  }

  function cambiarCantidad(pid, delta) {
    setItems(prev => prev.map(i => {
      if (i.producto_id !== pid) return i
      const nueva = Math.max(0.5, i.cantidad + delta)
      // Si solo hay un almacen asignado, lo seguimos igualando a la cantidad total (caso comun, sin dividir)
      const dist = i.distribucion.length === 1 ? [{ ...i.distribucion[0], cantidad: nueva }] : i.distribucion
      return { ...i, cantidad: nueva, subtotal: nueva * i.precio_unitario, distribucion: dist }
    }))
  }

  function cambiarPrecio(pid, val) {
    setItems(prev => prev.map(i => i.producto_id !== pid ? i : { ...i, precio_unitario: parseFloat(val)||0, subtotal: i.cantidad * (parseFloat(val)||0) }))
  }

  const total = items.reduce((s, i) => s + i.subtotal, 0)

  async function handleSave() {
    if (!items.length) { setError('Agrega al menos un producto'); return }
    for (const item of items) {
      const asignado = item.distribucion.reduce((s, d) => s + (d.cantidad||0), 0)
      if (Math.abs(asignado - item.cantidad) > 0.001) {
        setError(`"${item.nombre_producto}": la distribución por almacén (${asignado}) no coincide con la cantidad comprada (${item.cantidad}).`)
        return
      }
    }
    setSaving(true); setError('')
    try {
      const pagado = Object.values(montosPago).reduce((a,b)=>a+b,0)
      const metodos = Object.entries(montosPago).filter(([,v])=>v>0)
      const formaPago = metodos.length === 0 ? 'caja_chica' : metodos.length === 1 ? metodos[0][0] : 'mixto'
      await api.addCompra({ tienda_id: tiendaActual, proveedor_id: proveedorId || null, total, pagado, forma_pago: formaPago, notas, items, montos_pago: montosPago })
      navigate('/admin/compras')
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/compras')} className="btn btn-ghost btn-sm"><X size={14}/> Cancelar</button>
        <h1 className="text-xl font-bold text-slate-800">Nueva Compra</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 mb-3">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input ref={searchRef} className="flex-1 py-2 text-sm text-slate-800 bg-transparent outline-none placeholder:text-slate-400" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..." autoFocus />
            </div>
            {filtrados.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {filtrados.map(p => (
                  <button key={p.id} onClick={() => agregarItem(p)} className="w-full flex items-center justify-between px-4 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-0">
                    <span className="text-sm font-medium">{p.nombre}</span>
                    <span className="text-xs text-slate-400">Último: Bs. {parseFloat(p.precio_compra).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100"><p className="font-semibold text-slate-700">Productos ({items.length})</p></div>
            {items.length === 0 ? <div className="p-12 text-center text-slate-400 text-sm">Busca y agrega productos</div>
            : <div className="flex flex-col divide-y divide-slate-100">
                {items.map(item => {
                  const asignado = item.distribucion.reduce((s, d) => s + (d.cantidad||0), 0)
                  const restante = item.cantidad - asignado
                  return (
                    <div key={item.producto_id} className="p-4">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <div className="flex-1 min-w-[140px]">
                          <p className="font-semibold text-base">{item.nombre_producto}</p>
                          <p className="text-sm text-slate-400">{item.unidad}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => cambiarCantidad(item.producto_id,-1)} className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 hover:bg-slate-200"><Minus size={16}/></button>
                          <input type="number" className="inp w-20 text-lg py-2 text-center font-bold" value={item.cantidad} min="0" step="any" onChange={e => { const v=parseFloat(e.target.value)||0; setItems(prev=>prev.map(i=>i.producto_id!==item.producto_id?i:{...i,cantidad:v,subtotal:v*i.precio_unitario,distribucion: i.distribucion.length===1 ? [{...i.distribucion[0], cantidad:v}] : i.distribucion})) }} />
                          <button onClick={() => cambiarCantidad(item.producto_id,1)} className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 hover:bg-slate-200"><Plus size={16}/></button>
                        </div>
                        <div className="w-32 shrink-0">
                          <label className="text-[10px] text-slate-400 block">P. Compra</label>
                          <input type="number" className="inp text-sm py-1.5 font-bold" value={item.precio_unitario} onChange={e => cambiarPrecio(item.producto_id, e.target.value)} step="0.01" min="0" />
                        </div>
                        <div className="w-28 shrink-0 text-right">
                          <label className="text-[10px] text-slate-400 block">Subtotal</label>
                          <p className="font-bold text-lg">Bs. {item.subtotal.toFixed(2)}</p>
                        </div>
                        <button onClick={() => setItems(prev => prev.filter(i => i.producto_id !== item.producto_id))} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={18}/></button>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Distribuir en sucursales / almacenes</p>
                          <span className={`text-xs font-bold ${restante === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            Asignado: {asignado} / {item.cantidad} {restante !== 0 && `(${restante > 0 ? `falta ${restante}` : `sobra ${-restante}`})`}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {item.distribucion.map((d, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-2">
                              <select style={{ width: '220px' }} className="inp text-sm py-1.5" value={d.tienda_id || ''} onChange={e => actualizarDistribucion(item.producto_id, idx, 'tienda_id', e.target.value)}>
                                <option value="" disabled>Selecciona...</option>
                                {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.tipo === 'deposito' ? ' (depósito)' : ''}</option>)}
                              </select>
                              <input type="number" style={{ width: '90px' }} className="inp text-sm py-1.5 text-center" min="0" step="any" value={d.cantidad}
                                onChange={e => actualizarDistribucion(item.producto_id, idx, 'cantidad', e.target.value)} />
                              {item.distribucion.length > 1 && (
                                <button onClick={() => quitarFilaDistribucion(item.producto_id, idx)} className="text-slate-300 hover:text-red-500 shrink-0"><X size={16}/></button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button onClick={() => agregarFilaDistribucion(item.producto_id)}
                          className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                          <Plus size={13}/> Agregar otra sucursal/almacén
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>}
          </div>
        </div>
        <div className="card p-4 flex flex-col gap-3 h-fit">
          <h2 className="font-bold text-slate-700">Datos de compra</h2>
          <div><label className="lbl">Proveedor</label>
            <select className="inp" value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
              <option value="">Sin proveedor</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          {/* Pagos por método */}
          <div className="flex flex-col gap-2">
            <p className="lbl">Pagos por método</p>
            {[
              { v:'caja_chica',      l:'Caja Chica' },
              { v:'caja_grande',     l:'Caja Grande' },
              { v:'banco',           l:'Pago Banco' },
              { v:'billetera_jonny', l:'Billetera Jonny' },
            ].map(({ v, l }) => (
              <div key={v} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 w-32 shrink-0">{l}</span>
                <input type="number" className="inp text-sm py-1.5 font-semibold" placeholder="0.00" min="0" step="0.01"
                  value={montosPago[v] || ''}
                  onChange={e => setMontosPago(m => ({ ...m, [v]: parseFloat(e.target.value)||0 }))} />
              </div>
            ))}
          </div>

          <div><label className="lbl">Notas</label><textarea className="inp" rows={2} value={notas} onChange={e => setNotas(e.target.value)} /></div>

          {/* Resumen */}
          {(() => {
            const pagado = Object.values(montosPago).reduce((a,b)=>a+b,0)
            const saldo = total - pagado
            return (
              <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1">
                <div className="flex justify-between text-sm text-slate-600"><span>Total compra</span><span className="font-semibold">Bs. {total.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-emerald-700"><span>Total pagado</span><span className="font-semibold">Bs. {pagado.toFixed(2)}</span></div>
                <div className={`border-t border-slate-200 mt-1 pt-1 flex justify-between font-bold text-base ${saldo > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  <span>{saldo > 0 ? 'Falta pagar' : 'Pagado ✓'}</span>
                  <span>Bs. {Math.abs(saldo).toFixed(2)}</span>
                </div>
              </div>
            )
          })()}

          {error && <p className="text-red-500 text-sm bg-red-50 rounded p-2">{error}</p>}
          <button onClick={handleSave} disabled={saving || !items.length} className="btn btn-primary w-full justify-center py-3 disabled:opacity-40">
            <Check size={18}/> {saving ? 'Guardando...' : 'Registrar Compra'}
          </button>
        </div>
      </div>
    </div>
  )
}
