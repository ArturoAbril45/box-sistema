import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus, DollarSign, X, Check } from 'lucide-react'
import dayjs from 'dayjs'

export default function PrestamosDinero() {
  const { tiendaActual, user } = useAuth()
  const [lista, setLista]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [tipo, setTipo]         = useState('prestado')
  const [modal, setModal]       = useState(null)
  const [pagarModal, setPagarModal] = useState(null)
  const [form, setForm]         = useState({ tipo:'prestado', persona:'', concepto:'', monto:'', fecha_limite:'' })
  const [pagoMonto, setPagoMonto] = useState('')
  const [saving, setSaving]     = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  function cargar() {
    if (!tiendaActual) return
    setLoading(true)
    api.getPrestamosDinero({ tienda_id: tiendaActual, tipo }).then(setLista).finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [tiendaActual, tipo])

  async function guardar() {
    if (!form.persona || !form.monto) return
    setSaving(true)
    try { await api.addPrestamoDinero({ ...form, tienda_id: tiendaActual }); setModal(null); cargar() }
    catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function pagar() {
    if (!pagoMonto) return
    setSaving(true)
    try { await api.pagarPrestamoDinero(pagarModal.id, { monto: parseFloat(pagoMonto) }); setPagarModal(null); cargar() }
    catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const LABELS = { prestado: 'Prestado (yo presté)', recibido: 'Recibido (me prestaron)' }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Préstamos de Dinero</h1>
        <button onClick={() => { setForm({ tipo, persona:'', concepto:'', monto:'', fecha_limite:'' }); setModal(true) }} className="btn btn-primary"><Plus size={16}/> Nuevo</button>
      </div>
      <div className="flex gap-2 mb-4">
        {Object.entries(LABELS).map(([k,l]) => (
          <button key={k} onClick={() => setTipo(k)} className={`btn btn-sm ${tipo===k?'btn-primary':'btn-ghost'}`}>{l}</button>
        ))}
      </div>
      <div className="card">
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
        : lista.length === 0 ? <div className="p-12 text-center text-slate-400">Sin registros</div>
        : <table>
            <thead><tr><th>Persona</th><th>Concepto</th><th>Monto</th><th>Pagado</th><th>Saldo</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
            <tbody>{lista.map(p => (
              <tr key={p.id}>
                <td className="font-medium">{p.persona}</td>
                <td className="text-slate-500 text-sm">{p.concepto||'—'}</td>
                <td>Bs. {parseFloat(p.monto).toFixed(2)}</td>
                <td className="text-emerald-600">Bs. {parseFloat(p.pagado).toFixed(2)}</td>
                <td className="font-bold text-red-600">Bs. {parseFloat(p.saldo).toFixed(2)}</td>
                <td><span className={`badge ${p.estado==='pagado'?'badge-green':p.estado==='parcial'?'badge-yellow':'badge-red'}`}>{p.estado}</span></td>
                <td className="text-slate-400 text-xs">{dayjs(p.fecha).format('DD/MM/YY')}</td>
                <td>{p.estado !== 'pagado' && <button onClick={() => { setPagarModal(p); setPagoMonto(p.saldo) }} className="btn btn-success btn-sm py-1"><DollarSign size={14}/> Pagar</button>}</td>
              </tr>
            ))}</tbody>
          </table>}
      </div>

      {modal && (
        <div className="modal-overlay"><div className="modal max-w-sm w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold">Nuevo Préstamo de Dinero</h2>
            <button onClick={() => setModal(null)}><X size={18} className="text-slate-400"/></button>
          </div>
          <div className="p-6 flex flex-col gap-3">
            <div><label className="lbl">Tipo</label>
              <select className="inp" value={form.tipo} onChange={e => set('tipo',e.target.value)}>
                <option value="prestado">Presté dinero (me deben)</option>
                <option value="recibido">Me prestaron (yo debo)</option>
              </select>
            </div>
            <div><label className="lbl">Persona *</label><input className="inp" value={form.persona} onChange={e => set('persona',e.target.value)} placeholder="Nombre de la persona" /></div>
            <div><label className="lbl">Concepto</label><input className="inp" value={form.concepto} onChange={e => set('concepto',e.target.value)} placeholder="Para qué..." /></div>
            <div><label className="lbl">Monto *</label><input type="number" className="inp" value={form.monto} onChange={e => set('monto',e.target.value)} step="0.01" /></div>
            <div><label className="lbl">Fecha límite</label><input type="date" className="inp" value={form.fecha_limite} onChange={e => set('fecha_limite',e.target.value)} /></div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn btn-primary flex-1 justify-center"><Check size={16}/> Guardar</button>
            </div>
          </div>
        </div></div>
      )}

      {pagarModal && (
        <div className="modal-overlay"><div className="modal max-w-sm w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-bold">Registrar Pago</h2><button onClick={() => setPagarModal(null)}><X size={18} className="text-slate-400"/></button></div>
          <div className="p-6 flex flex-col gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="font-semibold">{pagarModal.persona}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">Saldo: Bs. {parseFloat(pagarModal.saldo).toFixed(2)}</p>
            </div>
            <div><label className="lbl">Monto a pagar</label><input type="number" className="inp text-lg font-bold" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} step="0.01"/></div>
            <button onClick={pagar} disabled={saving} className="btn btn-success w-full justify-center py-3"><Check size={16}/> {saving?'Guardando...':'Confirmar pago'}</button>
          </div>
        </div></div>
      )}
    </div>
  )
}
