import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus, X, Check, CreditCard } from 'lucide-react'
import dayjs from 'dayjs'

const TIPOS = ['tarjeta_regalo','recarga_movil','recarga_internet','bono','otro']

export default function Tarjetas() {
  const { tiendaActual } = useAuth()
  const [lista, setLista]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState({ tipo:'tarjeta_regalo', descripcion:'', monto:'', cliente_nombre:'', forma_pago:'efectivo', notas:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  function cargar() { if (!tiendaActual) return; setLoading(true); api.getTarjetas({ tienda_id: tiendaActual }).then(setLista).finally(() => setLoading(false)) }
  useEffect(() => { cargar() }, [tiendaActual])

  async function guardar() {
    if (!form.monto) { alert('Ingresa el monto'); return }
    setSaving(true)
    try { await api.addTarjeta({ ...form, tienda_id: tiendaActual }); setModal(false); cargar() }
    catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  const hoy = dayjs().format('YYYY-MM-DD')
  const totalHoy = lista.filter(i => i.fecha?.slice(0,10) === hoy).reduce((s,i) => s + parseFloat(i.monto||0), 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tarjetas y Recargas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Hoy: Bs. {totalHoy.toFixed(2)}</p>
        </div>
        <button onClick={() => { setForm({ tipo:'tarjeta_regalo', descripcion:'', monto:'', cliente_nombre:'', forma_pago:'efectivo', notas:'' }); setModal(true) }} className="btn btn-primary"><Plus size={16}/> Registrar</button>
      </div>
      <div className="card">
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
        : lista.length === 0 ? <div className="p-12 text-center text-slate-400"><CreditCard size={40} className="mx-auto mb-2 opacity-30"/><p>Sin registros</p></div>
        : <table>
            <thead><tr><th>Tipo</th><th>Descripción</th><th>Cliente</th><th>Monto</th><th>Forma pago</th><th>Fecha</th></tr></thead>
            <tbody>{lista.map(t => (
              <tr key={t.id}>
                <td><span className="badge badge-blue">{t.tipo?.replace(/_/g,' ')}</span></td>
                <td>{t.descripcion||'—'}</td>
                <td className="text-slate-500">{t.cliente_nombre||'—'}</td>
                <td className="font-bold">Bs. {parseFloat(t.monto).toFixed(2)}</td>
                <td className="capitalize text-slate-500">{t.forma_pago}</td>
                <td className="text-slate-400 text-xs">{dayjs(t.fecha).format('DD/MM/YY HH:mm')}</td>
              </tr>
            ))}</tbody>
          </table>}
      </div>

      {modal && (
        <div className="modal-overlay"><div className="modal max-w-md w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-bold">Nueva Tarjeta / Recarga</h2><button onClick={() => setModal(false)}><X size={18} className="text-slate-400"/></button></div>
          <div className="p-6 flex flex-col gap-3">
            <div><label className="lbl">Tipo *</label>
              <select className="inp" value={form.tipo} onChange={e => set('tipo',e.target.value)}>
                {TIPOS.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div><label className="lbl">Descripción</label><input className="inp" value={form.descripcion} onChange={e => set('descripcion',e.target.value)} placeholder="Ej: Tigo Bs. 50, Netflix 1 mes..." /></div>
            <div><label className="lbl">Cliente</label><input className="inp" value={form.cliente_nombre} onChange={e => set('cliente_nombre',e.target.value)} placeholder="Nombre del cliente" /></div>
            <div><label className="lbl">Monto (Bs.) *</label><input type="number" className="inp text-lg font-bold" value={form.monto} onChange={e => set('monto',e.target.value)} step="0.01" placeholder="0.00" /></div>
            <div><label className="lbl">Forma de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {['efectivo','qr','tarjeta'].map(f => <button key={f} onClick={() => set('forma_pago',f)} className={`py-2 rounded-lg text-xs font-bold capitalize ${form.forma_pago===f?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}>{f}</button>)}
              </div>
            </div>
            <div><label className="lbl">Notas</label><input className="inp" value={form.notas} onChange={e => set('notas',e.target.value)} placeholder="Observaciones..." /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(false)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn btn-primary flex-1 justify-center"><Check size={16}/> {saving?'Guardando...':'Registrar'}</button>
            </div>
          </div>
        </div></div>
      )}
    </div>
  )
}
