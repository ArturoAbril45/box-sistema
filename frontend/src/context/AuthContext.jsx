import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext()

// Módulos que puede ver cada rol
export const PERMISOS = {
  admin: ['*'],
  gerente: [
    'dashboard','ventas','compras','productos','clientes','proveedores','cuentas_pagar',
    'prestamos','prestamos_dinero','pedidos','cambios','caja','movimientos','traspasos',
    'tarjetas','asistencia','reportes','configuracion_ver',
  ],
  vendedor: [
    'dashboard','ventas','compras','productos_ver','clientes',
    'prestamos','cambios','caja','tarjetas',
  ],
}

export function puedeVer(user, modulo) {
  if (!user) return false
  const perms = PERMISOS[user.rol] || []
  return perms.includes('*') || perms.includes(modulo)
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tiendaActual, setTiendaActual] = useState(null)
  const [tiendaLogo, setTiendaLogo]     = useState(null)
  const [tiendaNombre, setTiendaNombre] = useState(null)
  const [cambiandoTienda, setCambiandoTienda] = useState(null)
  const [sesionExpirada, setSesionExpirada] = useState(false)

  useEffect(() => {
    function onSessionExpired() {
      localStorage.removeItem('box_token')
      setUser(null)
      setSesionExpirada(true)
    }
    window.addEventListener('session-expired', onSessionExpired)
    return () => window.removeEventListener('session-expired', onSessionExpired)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('box_token')
    if (token) {
      console.log('[Auth] Token encontrado en localStorage, verificando sesion...')
      api.me().then(u => {
        console.log('[Auth] Sesion valida - usuario:', u.username, '| rol:', u.rol)
        setUser(u)
        const tid = parseInt(localStorage.getItem('box_tienda') || u.tienda_id || '1')
        setTiendaActual(tid)
      }).catch(() => {
        console.log('[Auth] Token invalido o expirado, limpiando sesion')
        localStorage.removeItem('box_token')
      }).finally(() => setLoading(false))
    } else {
      console.log('[Auth] Sin sesion activa, mostrando login')
      setLoading(false)
    }
  }, [])

  async function login(username, password) {
    console.log('[Auth] Iniciando sesion para usuario:', username)
    const data = await api.login({ username, password })
    console.log('[Auth] Credenciales correctas, guardando token...')
    localStorage.setItem('box_token', data.token)
    localStorage.setItem('box_tienda', data.user.tienda_id || '1')
    setUser(data.user)
    setTiendaActual(parseInt(data.user.tienda_id || '1'))
    console.log('[Auth] Sesion iniciada - rol:', data.user.rol, '| tienda_id:', data.user.tienda_id)
    return data.user
  }

  async function logout() {
    await api.logout().catch(() => {})
    localStorage.removeItem('box_token')
    setUser(null)
    setTiendaActual(null)
  }

  function cambiarTienda(id, nombre, logo) {
    setCambiandoTienda(nombre || `Almacen ${id}`)
    setTimeout(() => {
      setTiendaActual(parseInt(id))
      localStorage.setItem('box_tienda', id)
      if (logo !== undefined) setTiendaLogo(logo || null)
      if (nombre !== undefined) setTiendaNombre(nombre || null)
      setCambiandoTienda(null)
    }, 1400)
  }

  const isAdmin   = user?.rol === 'admin'
  const isGerente = user?.rol === 'gerente' || isAdmin
  const puede     = (modulo) => puedeVer(user, modulo)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, tiendaActual, tiendaLogo, setTiendaLogo, tiendaNombre, setTiendaNombre, cambiarTienda, isAdmin, isGerente, puede }}>
      {children}
      {cambiandoTienda && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,23,42,0.7)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:0, padding:'2.5rem 3rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'1.25rem', boxShadow:'0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ width:48, height:48, border:'4px solid #e2e8f0', borderTop:'4px solid #2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            <p style={{ fontSize:'1.125rem', fontWeight:700, color:'#1e293b', margin:0 }}>Entrando a {cambiandoTienda}</p>
            <p style={{ fontSize:'0.8rem', color:'#94a3b8', margin:0 }}>Cargando datos de la sucursal...</p>
          </div>
        </div>
      )}

      {sesionExpirada && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,23,42,0.7)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:'1.5rem', padding:'2.5rem', maxWidth:340, width:'90%', display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem', boxShadow:'0 25px 60px rgba(0,0,0,0.3)', textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p style={{ fontSize:'1.05rem', fontWeight:700, color:'#1e293b', margin:0 }}>Tu sesión expiró</p>
            <p style={{ fontSize:'0.85rem', color:'#94a3b8', margin:0, lineHeight:1.5 }}>
              Por seguridad, la sesión se cierra sola después de un tiempo sin actividad. Volvé a ingresar tu usuario y contraseña para continuar.
            </p>
            <button
              onClick={() => { window.location.href = '/admin/login' }}
              style={{ marginTop:'0.5rem', width:'100%', padding:'0.7rem', background:'#2563eb', color:'#fff', border:'none', borderRadius:'0.75rem', fontSize:'0.9rem', fontWeight:600, cursor:'pointer' }}
            >
              Volver al login
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
