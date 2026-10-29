import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Edit, Trash2, X, Check, BarChart2 } from 'lucide-react'

const empty = { nombre:'', telefono:'', direccion:'', empresa:'', nit:'', correo:'', ciudad:'', tipo:'ventas' }

export default function Clientes() {
  const { tiendaActual } = useAuth()
  const navigate = useNavigate()
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  function cargar() { if (!tiendaActual) return; setLoading(true); api.getClientes({ tienda_id: tiendaActual }).then(setLista).finally(() => setLoading(false)) }
  useEffect(() => { cargar() }, [tiendaActual])

  async function guardar() {
    setSaving(true)
    try {
      if (modal === 'crear') await api.addCliente({ ...form, tienda_id: tiendaActual })
      else await api.updateCliente(form.id, form)
      setModal(null); cargar()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const filtrados = lista.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
        <p className="text-xs text-slate-400">Los clientes se crean desde Nueva Venta</p>
      </div>
      <div className="card">
        <div className="p-4 border-b border-slate-100"><input className="inp max-w-xs" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." /></div>
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
        : <table><thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Empresa</th><th>NIT</th><th>Saldo pendiente</th><th></th></tr></thead>
          <tbody>{filtrados.map(c => (
            <tr key={c.id}>
              <td className="font-medium">{c.nombre}</td>
              <td className="text-slate-500">{c.telefono||'—'}</td>
              <td className="text-slate-500">{c.correo||'—'}</td>
              <td className="text-slate-500">{c.empresa||'—'}</td>
              <td className="text-slate-500">{c.nit||'—'}</td>
              <td className={`font-bold ${parseFloat(c.saldo_pendiente)>0?'text-red-600':'text-slate-400'}`}>Bs. {parseFloat(c.saldo_pendiente||0).toFixed(2)}</td>
              <td><div className="flex gap-1">
                <button onClick={() => navigate(`/clientes/${c.id}`)} className="btn btn-ghost btn-sm py-1 px-2 text-blue-600" title="Ver reporte"><BarChart2 size={14}/></button>
                <button onClick={() => { setForm(c); setModal('editar') }} className="btn btn-ghost btn-sm py-1 px-2"><Edit size={14}/></button>
                <button onClick={async () => { if(confirm('¿Eliminar?')) { await api.deleteCliente(c.id); cargar() } }} className="btn btn-danger btn-sm py-1 px-2"><Trash2 size={14}/></button>
              </div></td>
            </tr>
          ))}</tbody></table>}
      </div>
      {modal && (
        <div className="modal-overlay"><div className="modal max-w-md w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-bold">{modal==='crear'?'Nuevo Cliente':'Editar Cliente'}</h2><button onClick={() => setModal(null)}><X size={18} className="text-slate-400"/></button></div>
          <div className="p-6 flex flex-col gap-3">
            <div><label className="lbl">Nombre *</label><input className="inp" value={form.nombre} onChange={e => set('nombre',e.target.value)} autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lbl">Teléfono</label><input className="inp" value={form.telefono||''} onChange={e => set('telefono',e.target.value)} /></div>
              <div><label className="lbl">Correo</label><input className="inp" type="email" value={form.correo||''} onChange={e => set('correo',e.target.value)} /></div>
            </div>
            <div><label className="lbl">Dirección</label><input className="inp" value={form.direccion||''} onChange={e => set('direccion',e.target.value)} /></div>
            <div><label className="lbl">Ciudad / Provincia</label><input className="inp" value={form.ciudad||''} onChange={e => set('ciudad',e.target.value)} placeholder="Ej: Santa Cruz, Cochabamba..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lbl">Empresa / Razón social</label><input className="inp" value={form.empresa||''} onChange={e => set('empresa',e.target.value)} /></div>
              <div><label className="lbl">NIT</label><input className="inp" value={form.nit||''} onChange={e => set('nit',e.target.value)} /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn btn-primary flex-1 justify-center"><Check size={16}/> Guardar</button>
            </div>
          </div>
        </div></div>
      )}
    </div>
  )
}
