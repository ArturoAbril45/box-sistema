import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus, X, Check, ArrowUpDown } from 'lucide-react'
import dayjs from 'dayjs'

const TIPOS = ['entrada','salida','ajuste','devolucion']
const BADGE  = { entrada:'badge-green', salida:'badge-red', ajuste:'badge-blue', devolucion:'badge-orange' }

export default function Movimientos() {
  const { tiendaActual } = useAuth()
  const [lista, setLista]     = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState({ producto_id:'', tipo:'entrada', cantidad:'', motivo:'', notas:'' })
  const [search, setSearch]   = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [saving, setSaving]   = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  function cargar() {
    if (!tiendaActual) return; setLoading(true)
    Promise.all([api.getMovimientos({ tienda_id: tiendaActual }), api.getProductos({ tienda_id: tiendaActual })])
      .then(([l,p]) => { setLista(l); setProductos(p) }).finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [tiendaActual])

  async function guardar() {
    if (!form.producto_id || !form.cantidad) { alert('Producto y cantidad son requeridos'); return }
    setSaving(true)
    try { await api.addMovimiento({ ...form, tienda_id: tiendaActual, cantidad: parseFloat(form.cantidad) }); setModal(false); cargar() }
    catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  const filtrados = lista.filter(m => (!filtroTipo || m.tipo === filtroTipo))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Movimientos de Inventario</h1>
        <button onClick={() => { setForm({ producto_id:'', tipo:'entrada', cantidad:'', motivo:'', notas:'' }); setModal(true) }} className="btn btn-primary"><Plus size={16}/> Nuevo Movimiento</button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFiltroTipo('')} className={`btn btn-sm ${!filtroTipo?'btn-primary':'btn-ghost'}`}>Todos</button>
        {TIPOS.map(t => <button key={t} onClick={() => setFiltroTipo(t)} className={`btn btn-sm capitalize ${filtroTipo===t?'btn-primary':'btn-ghost'}`}>{t}</button>)}
      </div>

      <div className="card">
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
        : filtrados.length === 0 ? <div className="p-12 text-center text-slate-400"><ArrowUpDown size={40} className="mx-auto mb-2 opacity-30"/><p>Sin movimientos</p></div>
        : <table>
            <thead><tr><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th><th>Fecha</th></tr></thead>
            <tbody>{filtrados.map(m => (
              <tr key={m.id}>
                <td><span className={`badge ${BADGE[m.tipo]||'badge-gray'}`}>{m.tipo}</span></td>
                <td className="font-medium">{m.producto_nombre||'—'}</td>
                <td className={`font-bold font-mono ${['entrada','devolucion'].includes(m.tipo)?'text-emerald-600':'text-red-500'}`}>{['entrada','devolucion'].includes(m.tipo)?'+':'-'}{parseFloat(m.cantidad).toFixed(2)}</td>
                <td className="text-slate-500">{m.motivo||'—'}</td>
                <td className="text-slate-400 text-xs">{m.usuario_nombre||'—'}</td>
                <td className="text-slate-400 text-xs">{dayjs(m.fecha).format('DD/MM/YY HH:mm')}</td>
              </tr>
            ))}</tbody>
          </table>}
      </div>

      {modal && (
        <div className="modal-overlay"><div className="modal max-w-md w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-bold">Nuevo Movimiento</h2><button onClick={() => setModal(false)}><X size={18} className="text-slate-400"/></button></div>
          <div className="p-6 flex flex-col gap-3">
            <div><label className="lbl">Tipo *</label>
              <div className="grid grid-cols-4 gap-2">
                {TIPOS.map(t => <button key={t} onClick={() => set('tipo',t)} className={`py-2 rounded-lg text-xs font-bold capitalize ${form.tipo===t?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}>{t}</button>)}
              </div>
            </div>
            <div><label className="lbl">Producto *</label>
              <select className="inp" value={form.producto_id} onChange={e => set('producto_id',e.target.value)}>
                <option value="">Seleccionar producto...</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (stock: {parseFloat(p.stock||0).toFixed(0)})</option>)}
              </select>
            </div>
            <div><label className="lbl">Cantidad *</label><input type="number" className="inp text-lg font-bold" value={form.cantidad} onChange={e => set('cantidad',e.target.value)} step="0.01" placeholder="0.00" min="0.01" /></div>
            <div><label className="lbl">Motivo</label><input className="inp" value={form.motivo} onChange={e => set('motivo',e.target.value)} placeholder="Razón del movimiento..." /></div>
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
