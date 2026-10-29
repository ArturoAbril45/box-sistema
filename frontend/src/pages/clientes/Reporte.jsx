import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { ArrowLeft, User, Phone, Mail, Building2, ShoppingBag, HandCoins, Package, X, Check, DollarSign, Search } from 'lucide-react'

function Badge({ estado }) {
  const map = {
    pagada:   { cls: 'bg-emerald-100 text-emerald-700', label: 'Pagada' },
    pagado:   { cls: 'bg-emerald-100 text-emerald-700', label: 'Pagado' },
    pendiente:{ cls: 'bg-amber-100 text-amber-700',     label: 'Pendiente' },
    parcial:  { cls: 'bg-blue-100 text-blue-700',       label: 'Parcial' },
    fiado:    { cls: 'bg-red-100 text-red-700',         label: 'Fiado' },
    anulada:  { cls: 'bg-slate-100 text-slate-500',     label: 'Anulada' },
  }
  const { cls, label } = map[estado] || { cls: 'bg-slate-100 text-slate-500', label: estado }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}

function noNull(v) { return v && v !== 'NULL' ? v : null }

function TabVentas({ ventas, busqueda, setBusqueda, totalComprado, totalPagadoVts, totalDeuda }) {
  const q = busqueda.trim().toLowerCase()
  const ventasFiltradas = q
    ? ventas
        .map(v => ({ ...v, items: (v.items||[]).filter(i => (i.nombre_producto||i.producto_nombre||'').toLowerCase().includes(q)) }))
        .filter(v => v.items.length > 0)
    : ventas

  return (
    <div className="flex flex-col gap-4">
      {ventas.length > 0 && (
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 bg-white w-fit" style={{ minWidth: 240 }}>
          <Search size={15} className="text-slate-400 shrink-0"/>
          <input
            className="py-2 text-sm outline-none flex-1 bg-transparent placeholder-slate-400"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X size={14}/>
            </button>
          )}
        </div>
      )}

      {ventasFiltradas.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <ShoppingBag size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">{q ? `Sin resultados para "${busqueda}"` : 'Sin ventas registradas'}</p>
        </div>
      ) : (
        <>
          {ventasFiltradas.map(v => (
            <div key={v.id} className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-400">{v.numero}</span>
                  <span className="text-xs text-slate-500">{new Date(v.fecha).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' })}</span>
                  <Badge estado={v.estado}/>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500">Total: <strong className="text-slate-800">Bs. {parseFloat(v.total||0).toFixed(2)}</strong></span>
                  <span className="text-emerald-600">Pagado: <strong>Bs. {parseFloat(v.pagado||0).toFixed(2)}</strong></span>
                  {parseFloat(v.saldo||0) > 0 && <span className="text-red-500">Saldo: <strong>Bs. {parseFloat(v.saldo||0).toFixed(2)}</strong></span>}
                  <span className="capitalize text-slate-400 text-xs">{v.forma_pago}</span>
                </div>
              </div>
              {v.items && v.items.length > 0 ? (
                <table>
                  <thead><tr><th>Producto</th><th className="text-center">Cantidad</th><th className="text-right">P. Unitario</th><th className="text-right">Subtotal</th></tr></thead>
                  <tbody>
                    {v.items.map((item, i) => (
                      <tr key={i}>
                        <td><div className="flex items-center gap-2"><Package size={13} className="text-slate-300 shrink-0"/><span className="font-medium text-sm">{item.nombre_producto || item.producto_nombre}</span></div></td>
                        <td className="text-center text-sm text-slate-600">{parseFloat(item.cantidad)} {item.unidad}</td>
                        <td className="text-right text-sm text-slate-600">Bs. {parseFloat(item.precio_unitario||0).toFixed(2)}</td>
                        <td className="text-right font-semibold text-slate-800">Bs. {parseFloat(item.subtotal||0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-400 px-4 py-3">Sin detalle de productos</p>
              )}
            </div>
          ))}
          <div className="card p-4 flex justify-end gap-6 text-sm font-bold">
            <span className="text-slate-600">Total comprado: <span className="text-slate-800">Bs. {totalComprado.toFixed(2)}</span></span>
            <span className="text-emerald-600">Total pagado: Bs. {totalPagadoVts.toFixed(2)}</span>
            {totalDeuda > 0 && <span className="text-red-500">Pendiente: Bs. {totalDeuda.toFixed(2)}</span>}
          </div>
        </>
      )}
    </div>
  )
}

export default function ReporteCliente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tiendaActual } = useAuth()

  const [cliente,  setCliente]  = useState(null)
  const [ventas,   setVentas]   = useState([])   // cada venta tiene .items cargado
  const [fiados,   setFiados]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('ventas')
  const [busqueda, setBusqueda] = useState('')
  const [modalCobro, setModalCobro] = useState(null) // fiado seleccionado
  const [montoCobro, setMontoCobro] = useState('')
  const [formaPagoCobro, setFormaPagoCobro] = useState('efectivo')
  const [savingCobro, setSavingCobro] = useState(false)

  useEffect(() => {
    if (!tiendaActual || !id) return
    setLoading(true)
    Promise.all([
      api.getClientes({ tienda_id: tiendaActual }),
      api.getVentas({ tienda_id: tiendaActual, cliente_id: id, desde: '2000-01-01', hasta: '2099-12-31' }),
      api.getPrestamos({ tienda_id: tiendaActual, cliente_id: id }),
    ]).then(async ([clts, vts, fds]) => {
      setCliente(clts.find(c => String(c.id) === String(id)) || null)
      setFiados(fds)
      // cargar items de cada venta en paralelo
      const ventasConItems = await Promise.all(
        vts.map(v => api.getVenta(v.id).then(d => ({ ...v, items: d.items || [] })).catch(() => ({ ...v, items: [] })))
      )
      setVentas(ventasConItems)
    }).finally(() => setLoading(false))
  }, [tiendaActual, id])

  function abrirCobro(f) {
    setModalCobro(f)
    setMontoCobro(parseFloat(f.saldo||0).toFixed(2))
    setFormaPagoCobro('efectivo')
  }

  async function handleCobrar() {
    const monto = parseFloat(montoCobro)
    if (!monto || monto <= 0) return
    setSavingCobro(true)
    try {
      await api.pagarPrestamo(modalCobro.id, { monto, forma_pago: formaPagoCobro })
      setModalCobro(null)
      // recargar fiados y ventas
      const [vts, fds] = await Promise.all([
        api.getVentas({ tienda_id: tiendaActual, cliente_id: id, desde: '2000-01-01', hasta: '2099-12-31' }),
        api.getPrestamos({ tienda_id: tiendaActual, cliente_id: id }),
      ])
      setFiados(fds)
      const ventasConItems = await Promise.all(
        vts.map(v => api.getVenta(v.id).then(d => ({ ...v, items: d.items || [] })).catch(() => ({ ...v, items: [] })))
      )
      setVentas(ventasConItems)
    } catch(e) { alert(e.message) } finally { setSavingCobro(false) }
  }

  if (loading) return <div className="p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>
  if (!cliente) return <div className="p-8 text-center text-slate-400">Cliente no encontrado</div>

  const ventasActivas  = ventas.filter(v => v.estado !== 'anulada')
  const totalComprado  = ventasActivas.reduce((s, v) => s + parseFloat(v.total||0), 0)
  const totalPagadoVts = ventasActivas.reduce((s, v) => s + parseFloat(v.pagado||0), 0)
  const totalDeuda     = ventasActivas.reduce((s, v) => s + parseFloat(v.saldo||0), 0)
  const totalFiado     = fiados.reduce((s, f) => s + parseFloat(f.saldo||0), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/clientes')} className="btn btn-ghost btn-sm"><ArrowLeft size={14}/> Clientes</button>
        <h1 className="text-xl font-bold text-slate-800">Reporte de cliente</h1>
      </div>

      {/* Info cliente */}
      <div className="card p-5 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <User size={22} className="text-blue-600"/>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">{cliente.nombre}</h2>
            <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-500">
              {noNull(cliente.telefono) && <span className="flex items-center gap-1"><Phone size={13}/>{cliente.telefono}</span>}
              {noNull(cliente.correo)   && <span className="flex items-center gap-1"><Mail size={13}/>{cliente.correo}</span>}
              {noNull(cliente.empresa)  && <span className="flex items-center gap-1"><Building2 size={13}/>{cliente.empresa}</span>}
              {noNull(cliente.ciudad)   && <span>{cliente.ciudad}</span>}
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="text-center px-4 py-2 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 mb-0.5">Total comprado</p>
              <p className="font-bold text-slate-800">Bs. {totalComprado.toFixed(2)}</p>
            </div>
            <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl">
              <p className="text-xs text-slate-400 mb-0.5">Total pagado</p>
              <p className="font-bold text-emerald-700">Bs. {totalPagadoVts.toFixed(2)}</p>
            </div>
            <div className={`text-center px-4 py-2 rounded-xl ${totalDeuda > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <p className="text-xs text-slate-400 mb-0.5">Deuda pendiente</p>
              <p className={`font-bold ${totalDeuda > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Bs. {totalDeuda.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4 w-fit">
        <button onClick={() => setTab('ventas')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${tab==='ventas'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
          <ShoppingBag size={13}/> Ventas ({ventas.length})
        </button>
        <button onClick={() => setTab('fiados')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${tab==='fiados'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
          <HandCoins size={13}/> Fiados ({fiados.length})
          {totalDeuda > 0 && <span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>}
        </button>
      </div>

      {/* Tab Ventas */}
      {tab === 'ventas' && <TabVentas
        ventas={ventas}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        totalComprado={totalComprado}
        totalPagadoVts={totalPagadoVts}
        totalDeuda={totalDeuda}
      />}

      {/* Tab Fiados */}
      {tab === 'fiados' && (
        <div className="card overflow-hidden">
          {fiados.length === 0 ? (
            <div className="p-10 text-center text-slate-400"><HandCoins size={32} className="mx-auto mb-2 opacity-30"/><p className="text-sm">Sin fiados registrados</p></div>
          ) : (
            <table>
              <thead><tr><th>Fecha</th><th>N°</th><th>Total fiado</th><th>Pagado</th><th>Saldo pendiente</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {fiados.map(f => (
                  <tr key={f.id}>
                    <td className="text-slate-400 text-xs">{new Date(f.fecha||f.created_at).toLocaleDateString('es-BO')}</td>
                    <td className="font-mono text-xs text-slate-500">{f.numero}</td>
                    <td className="font-semibold">Bs. {parseFloat(f.total||0).toFixed(2)}</td>
                    <td className="text-emerald-700 font-semibold">Bs. {parseFloat(f.pagado||0).toFixed(2)}</td>
                    <td className={`font-bold ${parseFloat(f.saldo||0)>0?'text-red-600':'text-emerald-600'}`}>
                      Bs. {parseFloat(f.saldo||0).toFixed(2)}
                    </td>
                    <td><Badge estado={f.estado}/></td>
                    <td>
                      {parseFloat(f.saldo||0) > 0 && (
                        <button onClick={() => abrirCobro(f)} className="btn btn-success btn-sm py-1 px-3 text-xs">
                          <DollarSign size={12}/> Cobrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={2} className="text-right text-slate-500 text-xs pr-2">TOTALES</td>
                  <td>Bs. {fiados.reduce((s,f)=>s+parseFloat(f.total||0),0).toFixed(2)}</td>
                  <td className="text-emerald-700">Bs. {fiados.reduce((s,f)=>s+parseFloat(f.pagado||0),0).toFixed(2)}</td>
                  <td className="text-red-600">Bs. {totalFiado.toFixed(2)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
      {/* Modal cobrar fiado */}
      {modalCobro && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModalCobro(null)}>
          <div className="modal max-w-sm w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Cobrar fiado</h2>
              <button onClick={() => setModalCobro(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <p className="text-slate-500">Cliente: <strong className="text-slate-800">{cliente.nombre}</strong></p>
                <p className="text-slate-500 mt-1">Saldo pendiente: <strong className="text-red-600">Bs. {parseFloat(modalCobro.saldo||0).toFixed(2)}</strong></p>
              </div>
              <div>
                <label className="lbl">Monto a cobrar (Bs.)</label>
                <input className="inp text-xl font-bold" type="number" min="0.01" step="0.01"
                  max={parseFloat(modalCobro.saldo||0)}
                  value={montoCobro}
                  onChange={e => setMontoCobro(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="lbl">Forma de pago</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['efectivo','qr','banco'].map(f => (
                    <button key={f} onClick={() => setFormaPagoCobro(f)}
                      className={`py-1.5 rounded text-xs font-bold capitalize transition-all ${formaPagoCobro===f?'bg-blue-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {f === 'qr' ? 'QR' : f === 'banco' ? 'Banco' : 'Efectivo'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setModalCobro(null)} className="btn btn-ghost flex-1">Cancelar</button>
                <button onClick={handleCobrar} disabled={savingCobro || !parseFloat(montoCobro)}
                  className="btn btn-success flex-1 justify-center">
                  <Check size={16}/> {savingCobro ? 'Guardando...' : 'Confirmar cobro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
