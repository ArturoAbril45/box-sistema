import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { ShoppingCart, Truck, HandCoins, AlertTriangle, TrendingUp, TrendingDown, Plus, DollarSign, ClipboardList, BarChart2 } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('es')

const COLOR_BG = { blue:'bg-blue-50 text-blue-600', green:'bg-emerald-50 text-emerald-600', orange:'bg-orange-50 text-orange-500', red:'bg-red-50 text-red-500' }

function StatCard({ icon: Icon, label, value, sub, color, to }) {
  const content = (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${COLOR_BG[color]||COLOR_BG.blue}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

const ACCESOS = [
  { label: 'Nueva Venta',      to: '/ventas/nueva',  icon: ShoppingCart, bg: 'bg-blue-50',    color: 'text-blue-700' },
  { label: 'Nueva Compra',     to: '/compras/nueva', icon: Truck,        bg: 'bg-orange-50',  color: 'text-orange-600' },
  { label: 'Cobrar Fiado',     to: '/prestamos',     icon: HandCoins,    bg: 'bg-red-50',     color: 'text-red-600' },
  { label: 'Ingresos/Egresos', to: '/caja',          icon: DollarSign,   bg: 'bg-emerald-50', color: 'text-emerald-600' },
  { label: 'Nuevo Pedido',     to: '/pedidos',       icon: ClipboardList,bg: 'bg-purple-50',  color: 'text-purple-600' },
  { label: 'Reportes',         to: '/reportes',      icon: BarChart2,    bg: 'bg-slate-50',   color: 'text-slate-600' },
]

export default function Dashboard() {
  const { tiendaActual, user, tiendaLogo, tiendaNombre } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [hora, setHora]       = useState(dayjs().tz('America/La_Paz'))
  const hoy = dayjs().format('YYYY-MM-DD')

  useEffect(() => {
    const t = setInterval(() => setHora(dayjs().tz('America/La_Paz')), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!tiendaActual) return
    api.getReporte('resumen', { tienda_id: tiendaActual, desde: hoy, hasta: hoy })
      .then(setData).catch(console.error).finally(() => setLoading(false))
  }, [tiendaActual])

  const fmt = n => 'Bs. ' + parseFloat(n||0).toLocaleString('es-BO', { minimumFractionDigits: 2 })

  return (
    <div className="p-6">
      {/* Banner superior */}
      <div className="mb-6 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm flex items-center gap-6 px-6 py-4">
        {tiendaLogo && <img src={tiendaLogo} alt={tiendaNombre || 'Logo'} className="h-16 object-contain shrink-0" />}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-800 leading-tight">{tiendaNombre || 'Comercial Boxer'}</h1>
          <p className="text-slate-500 text-sm capitalize">{hora.format('dddd DD [de] MMMM [de] YYYY')}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-blue-600 text-xs font-semibold">Bienvenido, {user?.nombre} · <span className="capitalize text-slate-400">{user?.rol}</span></p>
            <span className="text-slate-300">|</span>
            <p className="font-mono text-sm font-bold text-slate-700">{hora.format('HH:mm:ss')}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link to="/admin/ventas/nueva" className="btn btn-primary"><Plus size={14}/> Nueva Venta</Link>
          <Link to="/admin/caja" className="btn btn-ghost"><DollarSign size={14}/> Caja</Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_,i) => <div key={i} className="card p-5 h-28 animate-pulse bg-slate-50" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={ShoppingCart}  label="Ventas hoy"       value={fmt(data?.ventas?.total)}          sub={`${data?.ventas?.cnt||0} transacciones`} color="blue"   to="/admin/ventas" />
            <StatCard icon={Truck}         label="Compras hoy"      value={fmt(data?.compras?.total)}         sub={`${data?.compras?.cnt||0} compras`}       color="orange" to="/admin/compras" />
            <StatCard icon={HandCoins}     label="Fiado pendiente"  value={fmt(data?.prestamos?.saldo_total)} sub={`${data?.prestamos?.cnt||0} clientes`}    color="red"    to="/admin/prestamos" />
            <StatCard icon={AlertTriangle} label="Bajo stock"       value={data?.stock_bajo||0}               sub="Productos a reponer"                      color="red"    to="/admin/productos" />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp size={22} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Ingresos hoy</p>
                <p className="text-2xl font-bold text-emerald-600">{fmt(data?.flujo?.ingresos)}</p>
              </div>
            </div>
            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <TrendingDown size={22} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Egresos hoy</p>
                <p className="text-2xl font-bold text-red-500">{fmt(data?.flujo?.egresos)}</p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card p-5">
        <h2 className="font-bold text-slate-700 mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {ACCESOS.map(item => (
            <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105 hover:shadow-sm ${item.bg}`}>
              <item.icon size={22} className={item.color} />
              <span className={`text-xs font-semibold text-center leading-tight ${item.color}`}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
