import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus, Edit, Trash2, X, Check } from 'lucide-react'

const empty = { nombre:'', celular:'', correo:'', dni:'', ciudad:'', origen:'' }

export default function Proveedores() {
  const { tiendaActual } = useAuth()
  const [lista, setLista]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null)
  const [form, setForm]     = useState(empty)
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  function cargar() { if (!tiendaActual) return; setLoading(true); api.getProveedores({ tienda_id: tiendaActual }).then(setLista).finally(() => setLoading(false)) }
  useEffect(() => { cargar() }, [tiendaActual])

  async function guardar() {
    setSaving(true)
    try {
      if (modal==='crear') await api.addProveedor({ ...form, tienda_id: tiendaActual })
      else await api.updateProveedor(form.id, form)
      setModal(null); cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Proveedores</h1>
        <button onClick={() => { setForm(empty); setModal('crear') }} className="btn btn-primary"><Plus size={16}/> Nuevo Proveedor</button>
      </div>
      <div className="card">
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
        : <table><thead><tr><th>Nombre</th><th>Celular</th><th>Correo</th><th>DNI</th><th>Ciudad</th><th>De donde es</th><th></th></tr></thead>
          <tbody>{lista.map(p => (
            <tr key={p.id}>
              <td className="font-medium">{p.nombre}</td>
              <td className="text-slate-500">{p.celular||'—'}</td>
              <td className="text-slate-500">{p.correo||'—'}</td>
              <td className="text-slate-500">{p.dni||'—'}</td>
              <td className="text-slate-500">{p.ciudad||'—'}</td>
              <td className="text-slate-500">{p.origen||'—'}</td>
              <td><div className="flex gap-1">
                <button onClick={() => { setForm(p); setModal('editar') }} className="btn btn-ghost btn-sm py-1 px-2"><Edit size={14}/></button>
                <button onClick={async () => { if(confirm('¿Eliminar?')) { await api.deleteProveedor(p.id); cargar() } }} className="btn btn-danger btn-sm py-1 px-2"><Trash2 size={14}/></button>
              </div></td>
            </tr>
          ))}</tbody></table>}
      </div>
      {modal && (
        <div className="modal-overlay"><div className="modal max-w-lg w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-bold">{modal==='crear'?'Nuevo Proveedor':'Editar Proveedor'}</h2><button onClick={() => setModal(null)}><X size={18} className="text-slate-400"/></button></div>
          <div className="p-6 flex flex-col gap-3">
            <div><label className="lbl">Nombre *</label><input className="inp" value={form.nombre} onChange={e => set('nombre',e.target.value)} autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lbl">Celular</label><input className="inp" value={form.celular||''} onChange={e => set('celular',e.target.value)} placeholder="Ej: 76012345" /></div>
              <div><label className="lbl">Correo</label><input className="inp" type="email" value={form.correo||''} onChange={e => set('correo',e.target.value)} placeholder="email@ejemplo.com" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lbl">DNI / CI</label><input className="inp" value={form.dni||''} onChange={e => set('dni',e.target.value)} placeholder="Ej: 12345678" /></div>
              <div><label className="lbl">Ciudad</label><input className="inp" value={form.ciudad||''} onChange={e => set('ciudad',e.target.value)} placeholder="Ej: Santa Cruz" /></div>
            </div>
            <div><label className="lbl">De donde es (origen)</label><input className="inp" value={form.origen||''} onChange={e => set('origen',e.target.value)} placeholder="Ej: Cochabamba, Argentina..." /></div>
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
