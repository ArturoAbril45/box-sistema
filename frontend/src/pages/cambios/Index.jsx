import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus, X, Check } from 'lucide-react'
import dayjs from 'dayjs'

export default function Cambios() {
  const { tiendaActual } = useAuth()
  const [lista, setLista]       = useState([])
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState({ cliente_id:'', motivo:'', items:[] })
  const [search, setSearch]     = useState('')
  const [tipoItem, setTipoItem] = useState('devuelto')
  const [saving, setSaving]     = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  function cargar() {
    if (!tiendaActual) return; setLoading(true)
    Promise.all([api.getCambios({ tienda_id: tiendaActual }), api.getProductos({ tienda_id: tiendaActual }), api.getClientes({ tienda_id: tiendaActual })])
      .then(([l,p,c]) => { setLista(l); setProductos(p); setClientes(c) }).finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [tiendaActual])

  function agregarItem(prod) {
    setForm(f => ({...f, items: [...f.items, { tipo:tipoItem, producto_id:prod.id, nombre_producto:prod.nombre, cantidad:1, precio:prod.precio_venta, subtotal:prod.precio_venta }]}))
    setSearch('')
  }

  async function guardar() {
    if (!form.items.length) { alert('Agrega items'); return }
    setSaving(true)
    try { await api.addCambio({ ...form, tienda_id: tiendaActual }); setModal(false); cargar() }
    catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  const filtradosBusqueda = productos.filter(p => search.length > 1 && p.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Cambios de Producto</h1>
        <button onClick={() => { setForm({ cliente_id:'', motivo:'', items:[] }); setModal(true) }} className="btn btn-primary"><Plus size={16}/> Nuevo Cambio</button>
      </div>
      <div className="card">
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
        : lista.length === 0 ? <div className="p-12 text-center text-slate-400">No hay cambios registrados</div>
        : <table><thead><tr><th>N°</th><th>Cliente</th><th>Motivo</th><th>Devuelto</th><th>Nuevo</th><th>Diferencia</th><th>Fecha</th></tr></thead>
          <tbody>{lista.map(c => (
            <tr key={c.id}>
              <td className="font-mono text-xs font-bold text-blue-600">{c.numero}</td>
              <td>{c.cliente_nombre||'—'}</td>
              <td className="text-slate-500">{c.motivo||'—'}</td>
              <td>Bs. {parseFloat(c.total_devuelto).toFixed(2)}</td>
              <td>Bs. {parseFloat(c.total_nuevo).toFixed(2)}</td>
              <td className={`font-bold ${parseFloat(c.diferencia)>=0?'text-emerald-600':'text-red-500'}`}>{parseFloat(c.diferencia)>=0?'+':''}Bs. {parseFloat(c.diferencia).toFixed(2)}</td>
              <td className="text-slate-400 text-xs">{dayjs(c.fecha).format('DD/MM/YY HH:mm')}</td>
            </tr>
          ))}</tbody></table>}
      </div>

      {modal && (
        <div className="modal-overlay"><div className="modal max-w-2xl w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-bold">Nuevo Cambio</h2><button onClick={() => setModal(false)}><X size={18} className="text-slate-400"/></button></div>
          <div className="p-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lbl">Cliente</label>
                <select className="inp" value={form.cliente_id} onChange={e => set('cliente_id',e.target.value)}>
                  <option value="">Sin cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div><label className="lbl">Motivo</label><input className="inp" value={form.motivo} onChange={e => set('motivo',e.target.value)} placeholder="Defecto, talla incorrecta..." /></div>
            </div>
            <div>
              <div className="flex gap-2 mb-2">
                <button onClick={() => setTipoItem('devuelto')} className={`btn btn-sm ${tipoItem==='devuelto'?'btn-danger':'btn-ghost'}`}>↩ Producto devuelto</button>
                <button onClick={() => setTipoItem('nuevo')} className={`btn btn-sm ${tipoItem==='nuevo'?'btn-success':'btn-ghost'}`}>↪ Producto nuevo</button>
              </div>
              <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Buscar producto ${tipoItem==='devuelto'?'a devolver':'de reemplazo'}...`} />
              {filtradosBusqueda.length > 0 && (
                <div className="border border-slate-200 rounded-lg mt-1 max-h-36 overflow-y-auto">
                  {filtradosBusqueda.map(p => <button key={p.id} onClick={() => agregarItem(p)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0">{p.nombre} — Bs. {parseFloat(p.precio_venta).toFixed(2)}</button>)}
                </div>
              )}
            </div>
            {form.items.length > 0 && (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table>
                  <thead><tr><th>Tipo</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th><th></th></tr></thead>
                  <tbody>{form.items.map((item,idx) => (
                    <tr key={idx}>
                      <td><span className={`badge ${item.tipo==='devuelto'?'badge-red':'badge-green'}`}>{item.tipo==='devuelto'?'↩ Dev.':'↪ Nuevo'}</span></td>
                      <td className="text-sm font-medium">{item.nombre_producto}</td>
                      <td><input type="number" className="inp w-16 py-1 text-sm" value={item.cantidad} onChange={e => setForm(f=>({...f,items:f.items.map((i,j)=>j===idx?{...i,cantidad:parseFloat(e.target.value)||1,subtotal:(parseFloat(e.target.value)||1)*i.precio}:i)}))} min="0.01" step="0.01"/></td>
                      <td><input type="number" className="inp w-20 py-1 text-sm" value={item.precio} onChange={e => setForm(f=>({...f,items:f.items.map((i,j)=>j===idx?{...i,precio:parseFloat(e.target.value)||0,subtotal:i.cantidad*(parseFloat(e.target.value)||0)}:i)}))} step="0.01"/></td>
                      <td className="font-bold text-sm">Bs. {item.subtotal.toFixed(2)}</td>
                      <td><button onClick={() => setForm(f=>({...f,items:f.items.filter((_,j)=>j!==idx)}))} className="text-red-400 hover:text-red-600"><X size={14}/></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setModal(false)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn btn-primary flex-1 justify-center"><Check size={16}/> {saving?'Guardando...':'Registrar Cambio'}</button>
            </div>
          </div>
        </div></div>
      )}
    </div>
  )
}
