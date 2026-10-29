import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import RequirePermiso from './components/RequirePermiso'
import Login from './pages/Login'
import Tienda from './pages/tienda/Index'
import Spinner from './components/Spinner'

const Dashboard       = lazy(() => import('./pages/Dashboard'))
const Ventas          = lazy(() => import('./pages/ventas/Index'))
const NuevaVenta      = lazy(() => import('./pages/ventas/Nueva'))
const Cajero          = lazy(() => import('./pages/ventas/Cajero'))
const Compras         = lazy(() => import('./pages/compras/Index'))
const NuevaCompra     = lazy(() => import('./pages/compras/Nueva'))
const Productos       = lazy(() => import('./pages/productos/Index'))
const Clientes        = lazy(() => import('./pages/clientes/Index'))
const ReporteCliente  = lazy(() => import('./pages/clientes/Reporte'))
const Proveedores     = lazy(() => import('./pages/proveedores/Index'))
const Prestamos       = lazy(() => import('./pages/prestamos/Index'))
const PrestamosDinero = lazy(() => import('./pages/prestamos/Dinero'))
const Pedidos         = lazy(() => import('./pages/pedidos/Index'))
const Cambios         = lazy(() => import('./pages/cambios/Index'))
const Caja            = lazy(() => import('./pages/caja/Index'))
const Tarjetas        = lazy(() => import('./pages/tarjetas/Index'))
const Movimientos     = lazy(() => import('./pages/movimientos/Index'))
const Traspasos       = lazy(() => import('./pages/traspasos/Index'))
const Depositos       = lazy(() => import('./pages/depositos/Index'))
const Reportes        = lazy(() => import('./pages/reportes/Index'))
const Configuracion   = lazy(() => import('./pages/configuracion/Index'))
const Asistencia      = lazy(() => import('./pages/asistencia/Index'))
const CuentasPagar    = lazy(() => import('./pages/proveedores/CuentasPagar'))

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner full />
  if (!user) return <Navigate to="/admin/login" replace />
  return children
}

function P({ perm, children }) {
  return <RequirePermiso permiso={perm}>{children}</RequirePermiso>
}

function AppRoutes() {
  return (
    <Suspense fallback={<Spinner full />}>
      <Routes>
        {/* ── TIENDA PÚBLICA ── */}
        <Route path="/" element={<Tienda />} />

        {/* ── PANEL ADMIN ── */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index                          element={<P perm="dashboard"><Dashboard /></P>} />
          <Route path="ventas"                  element={<P perm="ventas"><Ventas /></P>} />
          <Route path="ventas/nueva"            element={<P perm="ventas"><NuevaVenta /></P>} />
          <Route path="cajero"                  element={<P perm="ventas"><Cajero /></P>} />
          <Route path="compras"                 element={<P perm="compras"><Compras /></P>} />
          <Route path="compras/nueva"           element={<P perm="compras"><NuevaCompra /></P>} />
          <Route path="productos"               element={<P perm="productos"><Productos /></P>} />
          <Route path="clientes"                element={<P perm="clientes"><Clientes /></P>} />
          <Route path="clientes/:id"            element={<P perm="clientes"><ReporteCliente /></P>} />
          <Route path="proveedores"             element={<P perm="proveedores"><Proveedores /></P>} />
          <Route path="cuentas-pagar"           element={<P perm="cuentas_pagar"><CuentasPagar /></P>} />
          <Route path="prestamos"               element={<P perm="prestamos"><Prestamos /></P>} />
          <Route path="prestamos/dinero"        element={<P perm="prestamos_dinero"><PrestamosDinero /></P>} />
          <Route path="pedidos"                 element={<P perm="pedidos"><Pedidos /></P>} />
          <Route path="cambios"                 element={<P perm="cambios"><Cambios /></P>} />
          <Route path="caja"                    element={<P perm="caja"><Caja /></P>} />
          <Route path="tarjetas"                element={<P perm="tarjetas"><Tarjetas /></P>} />
          <Route path="movimientos"             element={<P perm="movimientos"><Movimientos /></P>} />
          <Route path="traspasos"               element={<P perm="traspasos"><Traspasos /></P>} />
          <Route path="depositos"               element={<P perm="productos"><Depositos /></P>} />
          <Route path="reportes"                element={<P perm="reportes"><Reportes /></P>} />
          <Route path="configuracion"           element={<P perm="configuracion_ver"><Configuracion /></P>} />
          <Route path="asistencia"              element={<P perm="asistencia"><Asistencia /></P>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
