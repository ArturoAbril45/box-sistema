import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus } from 'lucide-react'
import dayjs from 'dayjs'

export default function Compras() {
  const { tiendaActual } = useAuth()
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState(dayjs().format('YYYY-MM-01'))
  const [hasta, setHasta] = useState(dayjs().format('YYYY-MM-DD'))

  useEffect(() => {
    if (!tiendaActual) return
    setLoading(true)
    api.getCompras({ tienda_id: tiendaActual, desde, hasta }).then(setCompras).finally(() => setLoading(false))
  }, [tiendaActual, desde, hasta])

  const total = compras.reduce((s, c) => s + parseFloat(c.total || 0), 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Compras</h1>
        <Link to="/admin/compras/nueva" className="btn btn-primary"><Plus size={16}/> Nueva Compra</Link>
      </div>
      <div className="card">
        <div className="p-4 flex flex-wrap gap-3 items-end border-b border-slate-100">
          <div><label className="lbl">Desde</label><input type="date" className="inp" value={desde} onChange={e => setDesde(e.target.value)} /></div>
          <div><label className="lbl">Hasta</label><input type="date" className="inp" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
          <div className="ml-auto"><p className="text-lg font-bold text-slate-800">Total: Bs. {total.toFixed(2)}</p></div>
        </div>
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        : <table>
            <thead><tr><th>N°</th><th>Proveedor</th><th>Total</th><th>Forma pago</th><th>Fecha</th></tr></thead>
            <tbody>{compras.map(c => (
              <tr key={c.id}>
                <td className="font-mono text-xs font-bold text-blue-600">{c.numero}</td>
                <td>{c.proveedor_nombre || '—'}</td>
                <td className="font-bold">Bs. {parseFloat(c.total).toFixed(2)}</td>
                <td className="capitalize">{c.forma_pago}</td>
                <td className="text-slate-400 text-xs">{dayjs(c.fecha).format('DD/MM/YY HH:mm')}</td>
              </tr>
            ))}</tbody>
          </table>}
      </div>
    </div>
  )
}
