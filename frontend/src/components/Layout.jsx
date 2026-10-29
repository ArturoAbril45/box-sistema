import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck, HandCoins,
  DollarSign, ClipboardList, RefreshCw, BarChart2, Settings,
  LogOut, Building2, CreditCard, UserCheck,
  ChevronDown, ChevronRight, Store, BadgeDollarSign, ArrowRightLeft, Warehouse,
  ChevronsLeft, ChevronsRight
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard',         to: '/admin',              icon: LayoutDashboard, exact: true, perm: 'dashboard' },
  { label: 'Ventas',            to: '/admin/ventas',        icon: ShoppingCart,                perm: 'ventas' },
  { label: 'Cajero',           to: '/admin/cajero',        icon: BadgeDollarSign,             perm: 'ventas' },
  { label: 'Compras',           to: '/admin/compras',       icon: Truck,                       perm: 'compras' },
  { label: 'Productos',         to: '/admin/productos',     icon: Package,                     perm: 'productos' },
  { label: 'Depósitos',         to: '/admin/depositos',     icon: Warehouse,                   perm: 'productos' },
  { label: 'Traspasos',         to: '/admin/traspasos',     icon: ArrowRightLeft,              perm: 'traspasos' },
  { label: 'Clientes',          icon: Users,                                                   perm: 'clientes', children: [
    { label: 'Lista clientes',    to: '/admin/clientes' },
    { label: 'Fiados',            to: '/admin/prestamos',    perm: 'prestamos' },
  ]},
  { label: 'Proveedores',       icon: Building2,                                               perm: 'proveedores', children: [
    { label: 'Lista proveedores', to: '/admin/proveedores' },
    { label: 'Cuentas por pagar', to: '/admin/cuentas-pagar', perm: 'cuentas_pagar' },
  ]},
  { label: 'Préstamos Dinero',  to: '/admin/prestamos/dinero', icon: HandCoins,               perm: 'prestamos_dinero' },
  { label: 'Pedidos',           to: '/admin/pedidos',       icon: ClipboardList,               perm: 'pedidos' },
  { label: 'Cambios',           to: '/admin/cambios',       icon: RefreshCw,                   perm: 'cambios' },
  { label: 'Caja',              icon: DollarSign,                                              perm: 'caja', children: [
    { label: 'Ingresos/Egresos', to: '/admin/caja' },
    { label: 'Movimientos',      to: '/admin/movimientos',  perm: 'movimientos' },
  ]},
  { label: 'Tarjetas/Recargas', to: '/admin/tarjetas',      icon: CreditCard,                  perm: 'tarjetas' },
  { label: 'Asistencia',        to: '/admin/asistencia',    icon: UserCheck,                   perm: 'asistencia' },
  { label: 'Reportes',          to: '/admin/reportes',      icon: BarChart2,                   perm: 'reportes' },
  { label: 'Configuración',     to: '/admin/configuracion', icon: Settings,                    perm: 'configuracion_ver' },
]

function NavItem({ item, collapsed, open, setOpen, puede }) {
  if (item.children) {
    const isOpen = open === item.label
    const visibleChildren = item.children.filter(c => !c.perm || puede(c.perm))
    if (!visibleChildren.length) return null
    return (
      <div>
        <button onClick={() => setOpen(isOpen ? null : item.label)}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold ${isOpen ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          <item.icon size={15} className="shrink-0" />
          {!collapsed && <><span className="flex-1 text-left">{item.label}</span>{isOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}</>}
        </button>
        {isOpen && !collapsed && (
          <div className="ml-6 mt-0.5 flex flex-col gap-0.5">
            {visibleChildren.map(c => (
              <NavLink key={c.to} to={c.to}
                className={({isActive}) => `block px-3 py-1 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                {c.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }
  if (!puede(item.perm)) return null
  return (
    <NavLink to={item.to} end={item.exact}
      className={({isActive}) => `flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
      <item.icon size={15} className="shrink-0" />
      {!collapsed && item.label}
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout, tiendaActual, setTiendaLogo, setTiendaNombre, cambiarTienda, isAdmin, puede } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroup, setOpenGroup] = useState(null)
  const [tiendas, setTiendas] = useState([])
  const navigate = useNavigate()
  const W = collapsed ? 64 : 236

  useEffect(() => {
    api.getTiendas({ tipo: 'sucursal' }).then(ts => {
      const sorted = [...ts].sort((a,b) => a.id - b.id)
      setTiendas(sorted)
      const activa = sorted.find(t => t.id === tiendaActual) || sorted[0]
      if (activa) { setTiendaLogo(activa.logo || null); setTiendaNombre(activa.nombre || null) }
    }).catch(() => {})
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside style={{ width: W }} className="fixed top-3 left-3 bottom-3 bg-white flex flex-col z-40 transition-all duration-200 overflow-hidden rounded-2xl shadow-xl border border-slate-200">


        {!collapsed && isAdmin && (
          <div className="px-3 py-2 border-b border-slate-100 shrink-0">
            <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Tienda activa</p>
            <div className="flex items-center gap-2 mb-1.5">
              <select value={tiendaActual || ''} onChange={e => { const t = tiendas.find(x => x.id == e.target.value); cambiarTienda(e.target.value, t?.nombre, t?.logo) }}
                className="flex-1 bg-slate-50 text-slate-700 text-xs rounded-lg px-2 py-1.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          </div>
        )}

        <nav className={`flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-0.5 ${collapsed ? 'justify-center' : ''}`}>
          {NAV.map(item => (
            <NavItem key={item.label} item={item} collapsed={collapsed} open={openGroup} setOpen={setOpenGroup} puede={puede} />
          ))}
        </nav>

        <div className="border-t border-slate-100 px-2 py-2 shrink-0">
          {!collapsed && user && (
            <div className="px-2 py-1 mb-1">
              <p className="text-slate-700 text-xs font-semibold truncate">{user.nombre}</p>
              <p className="text-slate-400 text-[10px] capitalize">{user.rol}</p>
            </div>
          )}
          <button onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Expandir menú' : 'Comprimir menú'}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-all ${collapsed ? 'justify-center' : ''}`}>
            {collapsed ? <ChevronsRight size={15}/> : <><ChevronsLeft size={15}/><span className="text-xs">Comprimir</span></>}
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all mt-0.5">
            <LogOut size={15}/>
            {!collapsed && <span className="text-xs">Salir</span>}
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: W + 12 }} className="flex-1 min-h-screen transition-all duration-200">
        <Outlet />
      </main>
    </div>
  )
}
