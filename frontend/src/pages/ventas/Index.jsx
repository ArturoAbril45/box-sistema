import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus, Eye, XCircle, X, Package } from 'lucide-react'
import dayjs from 'dayjs'

const ESTADO_BADGE = { pagada:'badge-green', pendiente:'badge-yellow', fiado:'badge-red', anulada:'badge-gray' }

export default function Ventas() {
  const { tiendaActual } = useAuth()
  const [ventas, setVentas]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [desde, setDesde]         = useState(dayjs().format('YYYY-MM-DD'))
  const [hasta, setHasta]         = useState(dayjs().format('YYYY-MM-DD'))
  const [detalle, setDetalle]     = useState(null)   // venta con items
  const [loadingDet, setLoadingDet] = useState(false)

  function cargar() {
    if (!tiendaActual) return
    setLoading(true)
    api.getVentas({ tienda_id: tiendaActual, desde, hasta }).then(setVentas).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [tiendaActual, desde, hasta])

  async function verDetalle(v) {
    setDetalle({ ...v, items: [] })
    setLoadingDet(true)
    try {
      const d = await api.getVenta(v.id)
      setDetalle(d)
    } catch { } finally { setLoadingDet(false) }
  }

  const total = ventas.filter(v => v.estado !== 'anulada').reduce((s, v) => s + parseFloat(v.total || 0), 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Ventas</h1>
        <Link to="/admin/ventas/nueva" className="btn btn-primary"><Plus size={16}/> Nueva Venta</Link>
      </div>

      <div className="card mb-4">
        <div className="p-4 flex flex-wrap gap-3 items-end border-b border-slate-100">
          <div><label className="lbl">Desde</label><input type="date" className="inp" value={desde} onChange={e => setDesde(e.target.value)} /></div>
          <div><label className="lbl">Hasta</label><input type="date" className="inp" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">{ventas.length} ventas</p>
            <p className="text-lg font-bold text-slate-800">Bs. {total.toFixed(2)}</p>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : ventas.length === 0 ? (
          <div className="p-12 text-center text-slate-400"><p>No hay ventas en este período</p></div>
        ) : (
          <table>
            <thead><tr><th>N°</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Forma pago</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
            <tbody>
              {ventas.map(v => (
                <tr key={v.id}>
                  <td className="font-mono text-xs font-bold text-blue-600">{v.numero}</td>
                  <td>{v.cliente_nombre || <span className="text-slate-300">—</span>}</td>
                  <td className="text-slate-500">{v.vendedor_nombre}</td>
                  <td className="font-bold">Bs. {parseFloat(v.total).toFixed(2)}</td>
                  <td className="capitalize">{v.forma_pago}</td>
                  <td><span className={`badge ${ESTADO_BADGE[v.estado]||'badge-gray'}`}>{v.estado}</span></td>
                  <td className="text-slate-400 text-xs">{dayjs(v.fecha).format('DD/MM/YY HH:mm')}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => verDetalle(v)} className="btn btn-ghost btn-sm py-1 px-2"><Eye size={14}/></button>
                      {v.estado !== 'anulada' && <button onClick={async () => { if(confirm('¿Anular venta?')) { await api.anularVenta(v.id); cargar() } }} className="btn btn-danger btn-sm py-1 px-2"><XCircle size={14}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal detalle venta */}
      {detalle && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setDetalle(null)}>
          <div className="modal max-w-2xl w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-800 font-mono">{detalle.numero}</p>
                <p className="text-xs text-slate-400">{dayjs(detalle.fecha).format('DD/MM/YYYY HH:mm')} · {detalle.vendedor_nombre}</p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* Info */}
              <div className="flex gap-4 text-sm flex-wrap">
                {detalle.cliente_nombre && <span className="text-slate-600">Cliente: <strong>{detalle.cliente_nombre}</strong></span>}
                <span className="text-slate-600">Forma pago: <strong className="capitalize">{detalle.forma_pago}</strong></span>
                <span><span className={`badge ${ESTADO_BADGE[detalle.estado]||'badge-gray'}`}>{detalle.estado}</span></span>
              </div>

              {/* Productos */}
              {loadingDet ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-4"><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/> Cargando detalle...</div>
              ) : (
                <table>
                  <thead><tr><th>Producto</th><th>Almacén</th><th className="text-center">Cantidad</th><th className="text-right">P. Unit.</th><th className="text-right">Subtotal</th></tr></thead>
                  <tbody>
                    {(detalle.items||[]).map((item, i) => (
                      <tr key={i}>
                        <td><div className="flex items-center gap-2"><Package size={13} className="text-slate-300"/><span className="font-medium text-sm">{item.nombre_producto}</span></div></td>
                        <td className="text-slate-500 text-sm">{item.almacen_nombre || <span className="text-slate-300">—</span>}</td>
                        <td className="text-center text-sm">{parseFloat(item.cantidad)} {item.unidad}</td>
                        <td className="text-right text-sm text-slate-600">Bs. {parseFloat(item.precio_unitario||0).toFixed(2)}</td>
                        <td className="text-right font-semibold">Bs. {parseFloat(item.subtotal||0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Resumen */}
              <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>Bs. {parseFloat(detalle.subtotal||detalle.total||0).toFixed(2)}</span></div>
                {parseFloat(detalle.descuento||0) > 0 && <div className="flex justify-between text-emerald-600"><span>Descuento</span><span>- Bs. {parseFloat(detalle.descuento).toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-1.5 mt-0.5"><span>TOTAL</span><span>Bs. {parseFloat(detalle.total||0).toFixed(2)}</span></div>
                <div className="flex justify-between text-emerald-600 font-semibold"><span>Pagado</span><span>Bs. {parseFloat(detalle.pagado||0).toFixed(2)}</span></div>
                {parseFloat(detalle.saldo||0) > 0 && <div className="flex justify-between text-red-500 font-semibold"><span>Saldo pendiente</span><span>Bs. {parseFloat(detalle.saldo).toFixed(2)}</span></div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
