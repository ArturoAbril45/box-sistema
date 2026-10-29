import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus, X, Check, Package } from 'lucide-react'
import dayjs from 'dayjs'

const ESTADO = { pendiente:'badge-yellow', recibido_parcial:'badge-orange', recibido:'badge-green', anulado:'badge-gray' }

export default function Pedidos() {
  const { tiendaActual } = useAuth()
  const [lista, setLista]         = useState([])
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState({ proveedor_id:'', notas:'', fecha_estimada:'', items:[] })
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  function cargar() {
    if (!tiendaActual) return; setLoading(true)
    Promise.all([api.getPedidos({ tienda_id: tiendaActual }), api.getProveedores({ tienda_id: tiendaActual }), api.getProductos({ tienda_id: tiendaActual })])
      .then(([l,p,pr]) => { setLista(l); setProveedores(p); setProductos(pr) }).finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [tiendaActual])

  function agregarItem(prod) {
    setForm(f => {
      if (f.items.find(i => i.producto_id === prod.id)) return f
      return { ...f, items: [...f.items, { producto_id:prod.id, nombre_producto:prod.nombre, cantidad:1, precio_estimado:prod.precio_compra||0 }] }
    }); setSearch('')
  }

  async function guardar() {
    if (!form.items.length) { alert('Agrega al menos un producto'); return }
    setSaving(true)
    try {
      const total = form.items.reduce((s,i) => s + i.cantidad * i.precio_estimado, 0)
      await api.addPedido({ ...form, tienda_id: tiendaActual, total_estimado: total })
      setModal(false); setForm({ proveedor_id:'', notas:'', fecha_estimada:'', items:[] }); cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  const filtradosBusqueda = productos.filter(p => search.length > 1 && p.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pedidos a Proveedores</h1>
        <button onClick={() => { setForm({ proveedor_id:'', notas:'', fecha_estimada:'', items:[] }); setModal(true) }} className="btn btn-primary"><Plus size={16}/> Nuevo Pedido</button>
      </div>
      <div className="card">
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
        : lista.length === 0 ? <div className="p-12 text-center text-slate-400"><Package size={40} className="mx-auto mb-2 opacity-30"/><p>No hay pedidos</p></div>
        : <table><thead><tr><th>N°</th><th>Proveedor</th><th>Total estimado</th><th>Estado</th><th>Fecha pedido</th><th>Fecha estimada</th></tr></thead>
          <tbody>{lista.map(p => (
            <tr key={p.id}>
              <td className="font-mono text-xs font-bold text-blue-600">{p.numero}</td>
              <td className="font-medium">{p.proveedor_nombre||'—'}</td>
              <td>Bs. {parseFloat(p.total_estimado||0).toFixed(2)}</td>
              <td><span className={`badge ${ESTADO[p.estado]||'badge-gray'}`}>{p.estado?.replace('_',' ')}</span></td>
              <td className="text-slate-400 text-xs">{dayjs(p.fecha_pedido).format('DD/MM/YY')}</td>
              <td className="text-slate-400 text-xs">{p.fecha_estimada ? dayjs(p.fecha_estimada).format('DD/MM/YY') : '—'}</td>
            </tr>
          ))}</tbody></table>}
      </div>

      {modal && (
        <div className="modal-overlay"><div className="modal max-w-2xl w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-bold">Nuevo Pedido</h2><button onClick={() => setModal(false)}><X size={18} className="text-slate-400"/></button></div>
          <div className="p-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lbl">Proveedor</label>
                <select className="inp" value={form.proveedor_id} onChange={e => set('proveedor_id',e.target.value)}>
                  <option value="">Sin proveedor</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div><label className="lbl">Fecha estimada de llegada</label><input type="date" className="inp" value={form.fecha_estimada} onChange={e => set('fecha_estimada',e.target.value)} /></div>
            </div>
            <div>
              <label className="lbl">Buscar producto</label>
              <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre del producto..." />
              {filtradosBusqueda.length > 0 && (
                <div className="border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
                  {filtradosBusqueda.map(p => (
                    <button key={p.id} onClick={() => agregarItem(p)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0">{p.nombre}</button>
                  ))}
                </div>
              )}
            </div>
            {form.items.length > 0 && (
              <table>
                <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio est.</th><th></th></tr></thead>
                <tbody>{form.items.map((item,idx) => (
                  <tr key={idx}>
                    <td className="text-sm font-medium">{item.nombre_producto}</td>
                    <td><input type="number" className="inp w-20 py-1 text-sm" value={item.cantidad} onChange={e => setForm(f => ({...f, items: f.items.map((i,j) => j===idx ? {...i,cantidad:parseFloat(e.target.value)||1} : i)}))} min="0.01" step="0.01"/></td>
                    <td><input type="number" className="inp w-24 py-1 text-sm" value={item.precio_estimado} onChange={e => setForm(f => ({...f, items: f.items.map((i,j) => j===idx ? {...i,precio_estimado:parseFloat(e.target.value)||0} : i)}))} step="0.01"/></td>
                    <td><button onClick={() => setForm(f => ({...f, items: f.items.filter((_,j) => j!==idx)}))} className="text-red-400 hover:text-red-600"><X size={14}/></button></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            <div><label className="lbl">Notas</label><textarea className="inp" rows={2} value={form.notas} onChange={e => set('notas',e.target.value)} /></div>
            <div className="flex gap-2">
              <button onClick={() => setModal(false)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn btn-primary flex-1 justify-center"><Check size={16}/> {saving?'Guardando...':'Crear Pedido'}</button>
            </div>
          </div>
        </div></div>
      )}
    </div>
  )
}
