import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Lock, User, Construction } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotMsg, setShowForgotMsg] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/admin')
    } catch (err) {
      setError(err.message || 'Usuario o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex bg-white overflow-y-auto">
      {/* ── Panel izquierdo: formulario ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end p-4 lg:pr-4 relative overflow-hidden">
        <div className="relative w-full max-w-sm py-4">
          <div className="bg-white/30 backdrop-blur-xl rounded-[2.5rem] shadow-[0_0_25px_rgba(217,119,6,0.12)] border border-white/40 p-6 sm:p-7">
            {/* Logo */}
            <div className="flex flex-col items-center mb-5">
              <img src="/boxer-logo.png" alt="Comercial Boxer" className="h-36 w-auto object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.25)]" />
              <p className="text-xs text-slate-500 text-center mt-2 px-2">
                Para iniciar sesión, ingresa tu usuario y contraseña a continuación.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Usuario */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Usuario</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="Nombre de usuario"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-amber-500 border border-amber-400 text-slate-900 rounded-xl text-sm font-bold hover:bg-amber-400 active:scale-95 transition-all disabled:opacity-60 mt-1 shadow-lg shadow-amber-300/50">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    Ingresando...
                  </span>
                ) : 'Ingresar al sistema'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-3">
              <button type="button" onClick={() => setShowForgotMsg(true)}
                className="hover:text-amber-600 transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
            </p>

          </div>

          <p className="text-center text-slate-500 text-xs mt-3">© 2026 SIDKAP · Box Sistema</p>
        </div>
      </div>

      {/* ── Panel derecho: ilustración ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-white items-center justify-center px-10">
        <div className="relative w-full max-w-md aspect-[4/5]">
          <div className="absolute inset-0 rounded-[3rem] bg-amber-50" />
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-amber-400" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-slate-900" />
          <img src="/login-imagen.jpg" alt="Comercial Boxer" className="absolute inset-5 w-[calc(100%-2.5rem)] h-[calc(100%-2.5rem)] object-cover rounded-[2.5rem] shadow-xl" />
        </div>
      </div>

      {/* ── Modal: función no disponible ── */}
      {showForgotMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setShowForgotMsg(false)}>
          <div className="contents">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xs p-9 relative text-center"
            onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <Construction size={28} className="text-amber-600" />
            </div>
            <p className="text-base font-semibold text-slate-700">Función no disponible aún</p>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Muy pronto vas a poder recuperar tu contraseña desde aquí.
            </p>
            <button type="button" onClick={() => setShowForgotMsg(false)}
              className="mt-6 w-full py-2.5 bg-amber-500 text-slate-900 rounded-full text-sm font-bold hover:bg-amber-400 transition-colors border border-amber-400">
              Entendido
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
