import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Warehouse, Plus, Trash2, Package, Check, X, Search } from 'lucide-react'

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-sm w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function Depositos() {
  const { tiendaActual } = useAuth()
  const [almacenes, setAlmacenes]       = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [productos, setProductos]       = useState([])
  const [loadingProds, setLoadingProds] = useState(false)
  const [search, setSearch]             = useState('')
  const [modal, setModal]               = useState(false)
  const [nombre, setNombre]             = useState('')
  const [saving, setSaving]             = useState(false)

  const cargar = () => {
    api.getAlmacenes().then(a => setAlmacenes([...a].sort((x,y) => x.id - y.id)))
  }

  useEffect(() => { cargar() }, [])

  function seleccionar(a) {
    if (seleccionado?.id === a.id) { setSeleccionado(null); setProductos([]); setSearch(''); return }
    setSeleccionado(a)
    setSearch('')
    setLoadingProds(true)
    api.getProductos({ tienda_id: a.id }).then(setProductos).finally(() => setLoadingProds(false))
  }

  async function crear() {
    if (!nombre.trim() || !tiendaActual) return
    setSaving(true)
    try {
      await api.addTienda({ nombre: nombre.trim(), tipo: 'deposito', sucursal_id: tiendaActual })
      setModal(false); setNombre(''); cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  async function eliminar(a) {
    if (!confirm(`¿Eliminar el depósito "${a.nombre}"?`)) return
    await api.deleteTienda(a.id)
    if (seleccionado?.id === a.id) { setSeleccionado(null); setProductos([]); setSearch('') }
    cargar()
  }

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.codigo || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Depósitos / Almacenes</h1>
        <button onClick={() => { setNombre(''); setModal(true) }} disabled={!tiendaActual} className="btn btn-primary">
          <Plus size={16}/> Nuevo depósito
        </button>
      </div>

      {almacenes.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Warehouse size={40} className="mx-auto mb-3 opacity-20"/>
          <p className="text-sm">Sin depósitos — crea el primero</p>
          <p className="text-xs mt-1 text-slate-300">El stock ingresa por traspasos</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 mb-6">
          {almacenes.map(a => (
            <div key={a.id}
              onClick={() => seleccionar(a)}
              className={`flex items-center gap-2 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all select-none ${seleccionado?.id === a.id ? 'border-blue-400 bg-blue-50' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
              <Warehouse size={15} className={seleccionado?.id === a.id ? 'text-blue-500' : 'text-slate-400'}/>
              <span className={`text-sm font-semibold ${seleccionado?.id === a.id ? 'text-blue-700' : 'text-slate-700'}`}>{a.nombre}</span>
              <button onClick={e => { e.stopPropagation(); eliminar(a) }} className="ml-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
            </div>
          ))}
        </div>
      )}

      {seleccionado && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-b border-blue-100">
            <Warehouse size={14} className="text-blue-500"/>
            <span className="text-sm font-semibold text-blue-700">{seleccionado.nombre}</span>
            <span className="text-xs text-blue-400 ml-1">— stock recibido por traspasos</span>
            <div className="ml-auto flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 w-52 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <Search size={13} className="text-slate-400 shrink-0"/>
              <input
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar producto..."
              />
            </div>
          </div>

          {loadingProds ? (
            <div className="p-8 text-center"><div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"/></div>
          ) : productos.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Package size={32} className="mx-auto mb-2 opacity-20"/>
              <p className="text-sm">Sin productos — realiza un traspaso hacia este depósito</p>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Sin resultados para "{search}"</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
              {filtrados.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-slate-50 overflow-hidden">
                    {p.foto
                      ? <img src={p.foto} alt={p.nombre} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                    }
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.nombre}</p>
                    {p.codigo && <p className="text-[10px] text-slate-400 font-mono">{p.codigo}</p>}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-slate-400">{p.unidad}</span>
                      <span className={`text-xs font-bold ${parseFloat(p.stock) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {parseFloat(p.stock).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal title="Nuevo Depósito" onClose={() => setModal(false)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="lbl">Nombre *</label>
              <input className="inp" autoFocus value={nombre} onChange={e => setNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && crear()}
                placeholder="Ej: Almacén Central, Depósito Norte..." />
            </div>
            <p className="text-xs text-blue-600 bg-blue-50 rounded p-2">El depósito se crea vacío. Recibe stock únicamente por traspasos.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(false)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={crear} disabled={saving || !nombre.trim()} className="btn btn-primary flex-1 justify-center">
                <Check size={16}/> {saving ? 'Guardando...' : 'Crear'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
