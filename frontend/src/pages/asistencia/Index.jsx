import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Check, X, Clock, UserCheck } from 'lucide-react'
import dayjs from 'dayjs'

const ESTADOS = ['presente','ausente','tardanza','permiso','feriado']
const BADGE_EST = { presente:'badge-green', ausente:'badge-red', tardanza:'badge-yellow', permiso:'badge-blue', feriado:'badge-gray' }

export default function Asistencia() {
  const { tiendaActual } = useAuth()
  const [lista, setLista]       = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(null)
  const [fecha, setFecha]       = useState(dayjs().format('YYYY-MM-DD'))
  const [modal, setModal]       = useState(null) // { empleado, registro? }

  function cargar() {
    if (!tiendaActual) return; setLoading(true)
    Promise.all([
      api.getAsistencia({ tienda_id: tiendaActual, fecha }),
      api.getEmpleados({ tienda_id: tiendaActual }),
    ]).then(([l, e]) => { setLista(l); setEmpleados(e) }).finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [tiendaActual, fecha])

  async function marcar(empleadoId, estado, notas='') {
    setSaving(empleadoId)
    try {
      await api.addAsistencia({ empleado_id: empleadoId, fecha, estado, notas, tienda_id: tiendaActual })
      cargar()
    } catch(e) { alert(e.message) } finally { setSaving(null) }
  }

  const registroHoy = (empId) => lista.find(r => r.empleado_id === empId)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Asistencia</h1>
        <input type="date" className="inp py-1.5" value={fecha} onChange={e => setFecha(e.target.value)} />
      </div>

      <div className="card">
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
        : empleados.length === 0 ? (
          <div className="p-12 text-center text-slate-400"><UserCheck size={40} className="mx-auto mb-2 opacity-30"/><p>No hay empleados registrados</p><p className="text-xs mt-1">Agrega empleados en Configuración</p></div>
        ) : (
          <table>
            <thead><tr><th>Empleado</th><th>Cargo</th><th>Estado</th><th>Hora entrada</th><th>Hora salida</th><th>Notas</th><th>Acciones</th></tr></thead>
            <tbody>{empleados.map(emp => {
              const reg = registroHoy(emp.id)
              return (
                <tr key={emp.id}>
                  <td className="font-medium">{emp.nombre}</td>
                  <td className="text-slate-400 text-xs">{emp.cargo||'—'}</td>
                  <td>{reg ? <span className={`badge ${BADGE_EST[reg.estado]||'badge-gray'}`}>{reg.estado}</span> : <span className="badge badge-gray">Sin marcar</span>}</td>
                  <td className="text-slate-500 text-xs">{reg?.hora_entrada||'—'}</td>
                  <td className="text-slate-500 text-xs">{reg?.hora_salida||'—'}</td>
                  <td className="text-slate-400 text-xs max-w-xs truncate">{reg?.notas||'—'}</td>
                  <td>
                    {saving === emp.id ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/> : (
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => marcar(emp.id,'presente')} title="Presente" className={`p-1 rounded ${reg?.estado==='presente'?'bg-emerald-100 text-emerald-700':'hover:bg-emerald-50 text-emerald-500'}`}><Check size={14}/></button>
                        <button onClick={() => marcar(emp.id,'ausente')} title="Ausente" className={`p-1 rounded ${reg?.estado==='ausente'?'bg-red-100 text-red-700':'hover:bg-red-50 text-red-400'}`}><X size={14}/></button>
                        <button onClick={() => marcar(emp.id,'tardanza')} title="Tardanza" className={`p-1 rounded ${reg?.estado==='tardanza'?'bg-amber-100 text-amber-700':'hover:bg-amber-50 text-amber-500'}`}><Clock size={14}/></button>
                        {['permiso','feriado'].map(e => (
                          <button key={e} onClick={() => marcar(emp.id,e)} className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${reg?.estado===e?'bg-blue-100 text-blue-700':'hover:bg-slate-100 text-slate-500'}`}>{e}</button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}</tbody>
          </table>
        )}
      </div>

      <div className="mt-6 grid grid-cols-5 gap-3">
        {ESTADOS.map(e => {
          const n = lista.filter(r => r.estado===e).length
          return <div key={e} className={`card p-3 text-center`}><div className="text-2xl font-bold">{n}</div><div className="text-xs text-slate-400 capitalize mt-0.5">{e}</div></div>
        })}
      </div>
    </div>
  )
}
