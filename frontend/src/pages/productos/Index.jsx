import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus, Edit, Trash2, X, Check, AlertTriangle, Package, Store, TrendingUp, TrendingDown, Search } from 'lucide-react'

function Modal({ title, onClose, children, size = 'max-w-3xl' }) {
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col ${size}`} style={{maxHeight:'92vh'}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

const emptyForm = { codigo:'', nombre:'', categoria_id:'', unidad_id:'', precio_compra:0, precio_mayor:0, precio_facturado:0, precio_sin_factura:0, stock:0, stock_minimo:0, permite_dividir:0, cantidad_divisible:'', visible_tienda:1, descripcion:'', divisiones:[] }
const FRACCION_TIPOS = ['Por metro', 'Por kilo', 'Por unidad']
const FRACCION_NUEVA = '__nueva__'

export default function Productos() {
  const { tiendaActual } = useAuth()

  // Productos
  const [productos, setProductos]   = useState([])
  const [categorias, setCategorias] = useState([])
  const [unidades, setUnidades]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(emptyForm)
  const [search, setSearch]         = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [nuevaCat, setNuevaCat]     = useState('')
  const [creandoCat, setCreandoCat] = useState(false)
  const [nuevaUnidad, setNuevaUnidad]   = useState('')
  const [creandoUnidad, setCreandoUnidad] = useState(false)
  const [fotoFile, setFotoFile]     = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [divTipo, setDivTipo]       = useState(FRACCION_TIPOS[0])
  const [divTipoNueva, setDivTipoNueva] = useState('')

  function cargarProductos() {
    if (!tiendaActual) return
    setLoading(true)
    Promise.all([
      api.getProductos({ tienda_id: tiendaActual }),
      api.getCategorias({ tienda_id: tiendaActual }),
      api.getUnidades({ tienda_id: tiendaActual }),
    ]).then(([p, c, u]) => { setProductos(p); setCategorias(c); setUnidades(u) }).finally(() => setLoading(false))
  }

  useEffect(() => { cargarProductos() }, [tiendaActual])

  // CRUD categorías
  async function crearCategoria() {
    if (!nuevaCat.trim()) return
    setCreandoCat(true)
    try {
      await api.addCategoria({ nombre: nuevaCat.trim(), tienda_id: tiendaActual })
      const cats = await api.getCategorias({ tienda_id: tiendaActual })
      setCategorias(cats)
      const nueva = cats.find(c => c.nombre === nuevaCat.trim())
      if (nueva) setForm(f => ({ ...f, categoria_id: nueva.id }))
      setNuevaCat('')
    } catch(e) { alert(e.message) } finally { setCreandoCat(false) }
  }

  async function crearUnidad() {
    if (!nuevaUnidad.trim()) return
    setCreandoUnidad(true)
    try {
      await api.addUnidad({ nombre: nuevaUnidad.trim(), tienda_id: tiendaActual })
      const unis = await api.getUnidades({ tienda_id: tiendaActual })
      setUnidades(unis)
      const nueva = unis.find(u => u.nombre === nuevaUnidad.trim())
      if (nueva) setForm(f => ({ ...f, unidad_id: nueva.id }))
      setNuevaUnidad('')
    } catch(e) { alert(e.message) } finally { setCreandoUnidad(false) }
  }

  // CRUD productos
  function onFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file); setFotoPreview(URL.createObjectURL(file))
  }

  function abrirCrear() {
    setForm({ ...emptyForm, tienda_id: tiendaActual })
    setFotoFile(null); setFotoPreview(null); setModal('crear'); setError('')
  }

  function abrirEditar(p) {
    const uid = unidades.find(u => u.nombre === p.unidad)?.id || ''
    setForm({ ...p, unidad_id: uid, divisiones: p.divisiones || [] })
    setFotoFile(null); setFotoPreview(null); setModal(p); setError('')
  }

  async function handleSave() {
    if (!form.nombre) { setError('El nombre es requerido'); return }
    setSaving(true); setError('')
    try {
      const unidadNombre = unidades.find(u => u.id == form.unidad_id)?.nombre || ''
      const fd = new FormData()
      const fields = { ...form, unidad: unidadNombre, tienda_id: tiendaActual, visible_tienda: form.visible_tienda ? 1 : 0 }
      Object.entries(fields).forEach(([k,v]) => { if (v !== null && v !== undefined && k !== 'divisiones') fd.append(k, v) })
      fd.append('divisiones', JSON.stringify(form.divisiones || []))
      if (fotoFile) fd.append('foto', fotoFile)
      else if (form.foto) fd.append('foto_actual', form.foto)
      if (modal === 'crear') await api.addProducto(fd)
      else await api.updateProducto(form.id, fd)
      setModal(null); cargarProductos()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar producto?')) return
    await api.deleteProducto(id); cargarProductos()
  }

  // Ajuste de precios
  const [modalAjuste, setModalAjuste] = useState(false)
  const [ajuste, setAjuste] = useState({ campo: 'todos', tipo: 'incremento', modo: '%', valor: '' })
  const [aplicandoAjuste, setAplicandoAjuste] = useState(false)
  const [seleccionados, setSeleccionados] = useState(new Set()) // ids seleccionados
  const [searchAjuste, setSearchAjuste] = useState('')
  const setAj = (k, v) => setAjuste(a => ({ ...a, [k]: v }))

  function abrirAjusteMasivo() {
    setSeleccionados(new Set())
    setSearchAjuste('')
    setAjuste({ campo: 'todos', tipo: 'incremento', modo: '%', valor: '' })
    setModalAjuste(true)
  }

  const productosFiltradosAjuste = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchAjuste.toLowerCase()) ||
    (p.codigo || '').toLowerCase().includes(searchAjuste.toLowerCase())
  )

  function toggleSeleccion(id) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleTodos() {
    if (seleccionados.size === productosFiltradosAjuste.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(productosFiltradosAjuste.map(p => p.id)))
    }
  }

  async function aplicarAjuste() {
    const val = parseFloat(ajuste.valor)
    if (!val || val <= 0) return alert('Ingresa un valor mayor a 0')

    const destinos = seleccionados.size > 0
      ? productos.filter(p => seleccionados.has(p.id))
      : productos

    if (!confirm(`¿Aplicar ${ajuste.tipo === 'incremento' ? 'incremento' : 'reducción'} de ${ajuste.valor}${ajuste.modo} a ${destinos.length} producto${destinos.length !== 1 ? 's' : ''}?`)) return

    const campos = ajuste.campo === 'todos'
      ? ['precio_mayor','precio_compra','precio_facturado','precio_sin_factura']
      : [ajuste.campo]

    const calcNuevo = old => {
      const n = ajuste.modo === '%'
        ? (ajuste.tipo === 'incremento' ? old*(1+val/100) : Math.max(0, old*(1-val/100)))
        : (ajuste.tipo === 'incremento' ? old+val : Math.max(0, old-val))
      return parseFloat(n.toFixed(2))
    }

    setAplicandoAjuste(true)
    try {
      if (seleccionados.size === 0) {
        // masivo vía backend (más eficiente)
        const res = await api.ajustePrecio({ tienda_id: tiendaActual, ...ajuste, valor: val })
        alert(`✓ ${res.actualizados} productos actualizados`)
      } else {
        // individual por cada seleccionado
        for (const p of destinos) {
          const updates = {}
          campos.forEach(c => { updates[c] = calcNuevo(parseFloat(p[c] || 0)) })
          const unidadNombre = unidades.find(u => u.id == p.unidad_id)?.nombre || p.unidad || ''
          const fd = new FormData()
          const fields = { ...p, ...updates, unidad: unidadNombre, tienda_id: tiendaActual }
          Object.entries(fields).forEach(([k,v]) => { if (v !== null && v !== undefined && k !== 'divisiones') fd.append(k, v) })
          fd.append('divisiones', JSON.stringify(p.divisiones || []))
          if (p.foto) fd.append('foto_actual', p.foto)
          await api.updateProducto(p.id, fd)
        }
      }
      setModalAjuste(false)
      cargarProductos()
    } catch(e) { alert(e.message) } finally { setAplicandoAjuste(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const ordenarPorCodigo = (a, b) => {
    const ca = (a.codigo || '').trim(), cb = (b.codigo || '').trim()
    if (!ca && !cb) return a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' })
    if (!ca) return 1
    if (!cb) return -1
    return ca.localeCompare(cb, 'es', { numeric: true, sensitivity: 'base' })
  }
  const filtrados = productos
    .filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.codigo||'').toLowerCase().includes(search.toLowerCase()))
    .sort(ordenarPorCodigo)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Productos</h1>
        <button onClick={abrirAjusteMasivo} disabled={!tiendaActual || productos.length === 0} className="btn btn-ghost border border-slate-200">
          <TrendingUp size={15}/> Ajuste de precio
        </button>
        <button onClick={abrirCrear} disabled={!tiendaActual} className="btn btn-primary"><Plus size={16}/> Nuevo Producto</button>
      </div>


      <div className="card">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-500 text-sm shrink-0">
            <Package size={13}/> {filtrados.length} / {productos.length} productos
          </span>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-sm ml-auto focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <Search size={14} className="text-slate-400 shrink-0"/>
            <input
              className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o código..."
            />
            {search && <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500"><X size={13}/></button>}
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package size={32} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">{search ? 'Sin resultados' : 'No hay productos en esta tienda'}</p>
            {!search && <button onClick={abrirCrear} className="btn btn-primary mt-3"><Plus size={14}/> Crear primer producto</button>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
            {filtrados.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                {/* Foto */}
                <div className="aspect-square bg-slate-50 overflow-hidden relative">
                  {p.foto
                    ? <img src={p.foto} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"/>
                    : <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
                  }
                  {/* Badge stock */}
                  <div className="absolute top-2 right-2">
                    {parseFloat(p.stock) === 0
                      ? <span className="text-[10px] font-bold bg-blue-500 text-white rounded-full px-2 py-0.5">Sin stock</span>
                      : p.stock <= p.stock_minimo && p.stock_minimo > 0
                        ? <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-2 py-0.5">Bajo</span>
                        : null
                    }
                  </div>
                  {/* Acciones hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => abrirEditar(p)} className="bg-white text-slate-700 rounded-lg p-1.5 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Edit size={15}/></button>
                    <button onClick={() => handleDelete(p.id)} className="bg-white text-slate-700 rounded-lg p-1.5 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 size={15}/></button>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{p.nombre}</p>
                  {p.codigo && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.codigo}</p>}
                  <div className="mt-2 flex flex-col gap-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">Compra</span>
                      <span className="text-xs font-semibold text-slate-500">Bs. {parseFloat(p.precio_compra||0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">Mayor</span>
                      <span className="text-xs font-bold text-slate-700">Bs. {parseFloat(p.precio_mayor||0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">s/Fact.</span>
                      <span className="text-xs font-semibold text-emerald-600">Bs. {parseFloat(p.precio_sin_factura||0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">c/Fact.</span>
                      <span className="text-xs font-semibold text-blue-600">Bs. {parseFloat(p.precio_facturado||0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">{p.unidad}</span>
                    <span className={`text-xs font-bold ${parseFloat(p.stock) > 0 ? 'text-slate-700' : 'text-slate-400'}`}>{parseFloat(p.stock).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal producto */}
      {modal && (
        <Modal title={modal === 'crear' ? 'Nuevo Producto' : 'Editar Producto'} onClose={() => setModal(null)} size={form.permite_dividir ? 'max-w-5xl' : 'max-w-3xl'}>
          <div className="flex gap-6 items-start">
            {/* Columna izquierda: formulario */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="lbl">Código</label><input className="inp" value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="MAT001" /></div>
              <div><label className="lbl">Categoría</label>
                <select className="inp mb-1" value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <div className="flex gap-1">
                  <input className="inp py-1 text-xs" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} placeholder="Nueva categoría..." onKeyDown={e => e.key==='Enter' && crearCategoria()}/>
                  <button onClick={crearCategoria} disabled={creandoCat || !nuevaCat.trim()} className="btn btn-sm btn-primary px-2 shrink-0">+ Crear</button>
                </div>
              </div>
              <div><label className="lbl">Unidad</label>
                <select className="inp mb-1" value={form.unidad_id} onChange={e => set('unidad_id', e.target.value)}>
                  <option value="">Sin unidad</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
                <div className="flex gap-1">
                  <input className="inp py-1 text-xs" value={nuevaUnidad} onChange={e => setNuevaUnidad(e.target.value)} placeholder="Nueva unidad..." onKeyDown={e => e.key==='Enter' && crearUnidad()}/>
                  <button onClick={crearUnidad} disabled={creandoUnidad || !nuevaUnidad.trim()} className="btn btn-sm btn-primary px-2 shrink-0">+ Crear</button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="lbl">Nombre *</label><input className="inp" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del producto" /></div>
              <div className="col-span-2"><label className="lbl">Descripción</label><textarea className="inp" rows={2} value={form.descripcion||''} onChange={e => set('descripcion', e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 bg-slate-50">
                {fotoPreview || form.foto ? <img src={fotoPreview || form.foto} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl">📦</span>}
              </div>
              <div className="flex-1">
                <label className="lbl">Foto del producto</label>
                <input type="file" accept="image/*" onChange={onFoto} className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — máx. 5MB</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="lbl">P. Compra (Bs.)</label><input type="number" className="inp w-full" value={form.precio_compra} onChange={e => set('precio_compra', e.target.value)} step="0.01" /></div>
              <div><label className="lbl">P. por Mayor (Bs.)</label><input type="number" className="inp w-full" value={form.precio_mayor} onChange={e => set('precio_mayor', e.target.value)} step="0.01" /></div>
              <div><label className="lbl">P. sin Factura (Bs.)</label><input type="number" className="inp w-full" value={form.precio_sin_factura} onChange={e => set('precio_sin_factura', e.target.value)} step="0.01" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="lbl">P. con Factura (Bs.)</label><input type="number" className="inp w-full" value={form.precio_facturado} onChange={e => set('precio_facturado', e.target.value)} step="0.01" /></div>
              <div><label className="lbl">Stock mínimo</label><input type="number" className="inp w-full" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} step="0.01" /></div>
            </div>

            {/* Toggle Permite dividir */}
            <button type="button" onClick={() => set('permite_dividir', form.permite_dividir ? 0 : 1)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-all ${form.permite_dividir ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
              <div className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${form.permite_dividir ? 'bg-blue-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.permite_dividir ? 'translate-x-4' : 'translate-x-0.5'}`}/>
              </div>
              <div>
                <p className={`text-sm font-semibold ${form.permite_dividir ? 'text-blue-700' : 'text-slate-700'}`}>Permite dividir / vender por fracción</p>
                <p className="text-xs text-slate-400">Ej: rollo de 50m → vender por metros</p>
              </div>
              {form.permite_dividir && <span className="ml-auto text-xs text-blue-500 font-medium">→ panel derecho</span>}
            </button>

            <button
              type="button"
              onClick={() => set('visible_tienda', form.visible_tienda ? 0 : 1)}
              className={`flex items-center gap-2 w-full rounded-lg border px-2.5 py-1.5 text-left transition-all ${form.visible_tienda ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <Store size={13} className={form.visible_tienda ? 'text-emerald-600 shrink-0' : 'text-slate-400 shrink-0'}/>
              <span className={`text-xs font-medium flex-1 ${form.visible_tienda ? 'text-emerald-700' : 'text-slate-600'}`}>Visible en tienda virtual</span>
              <div className={`w-8 h-4 rounded-full shrink-0 relative transition-colors ${form.visible_tienda ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${form.visible_tienda ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>

            {error && <p className="text-red-500 text-sm bg-red-50 rounded p-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 justify-center">
                <Check size={16}/> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            </div>{/* fin columna izquierda */}

            {/* Panel derecho: divisiones */}
            {!!form.permite_dividir && (
              <div className="w-72 shrink-0 border-l border-blue-100 pl-5 flex flex-col gap-3">
                <p className="text-sm font-bold text-blue-700">Fracciones de venta</p>

                {/* Total disponible */}
                <div>
                  <label className="text-[10px] text-blue-500 font-semibold uppercase">Cantidad total del artículo</label>
                  <input type="text" inputMode="decimal" className="inp text-sm" placeholder="Ej: rollo de 50 m → 50"
                    value={form.cantidad_divisible ?? ''}
                    onChange={e => {
                      let v = e.target.value.replace(/[^0-9.]/g, '')
                      const dot = v.indexOf('.')
                      if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '')
                      set('cantidad_divisible', v)
                    }}/>
                  <p className="text-[10px] text-slate-400 mt-1">Cuánto trae el artículo en total para vender por fracción (metros, kilos o unidades).</p>
                </div>

                {/* Cálculos (referencia con precio por mayor) */}
                {parseFloat(form.cantidad_divisible) > 0 && (form.divisiones||[]).length > 0 && (
                  <div className="flex flex-col gap-1">
                    {form.divisiones.map((d,i) => {
                      const disponible = parseFloat(form.cantidad_divisible) || 0
                      const porciones = d.cantidad > 0 ? disponible / d.cantidad : 0
                      const total = porciones * (parseFloat(d.precio_mayor)||0)
                      return (
                        <div key={i} className="text-xs bg-blue-50 rounded px-2 py-1">
                          <span className="font-medium text-slate-700">{d.nombre}:</span>{' '}
                          <span className="text-slate-500">{porciones % 1 === 0 ? porciones : porciones.toFixed(1)} × Bs.{parseFloat(d.precio_mayor||0).toFixed(2)} (mayor)</span>{' '}
                          = <span className="font-bold text-emerald-600">Bs. {total.toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Lista divisiones */}
                {(form.divisiones||[]).length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {form.divisiones.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{d.nombre}</p>
                          <p className="text-[10px] text-slate-400">
                            Compra: Bs.{parseFloat(d.precio_compra||0).toFixed(2)} · Mayor: Bs.{parseFloat(d.precio_mayor||0).toFixed(2)} · S/F: Bs.{parseFloat(d.precio_sin_factura||0).toFixed(2)} · C/F: Bs.{parseFloat(d.precio_facturado||0).toFixed(2)}
                          </p>
                        </div>
                        <button type="button" onClick={() => set('divisiones', form.divisiones.filter((_,j)=>j!==i))}
                          className="text-slate-300 hover:text-red-500 transition-colors shrink-0"><X size={13}/></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-blue-100 pt-3 flex flex-col gap-2">
                  <p className="text-[10px] text-blue-500 font-semibold uppercase">Agregar fracción</p>
                  <select className="inp text-sm" value={divTipo} onChange={e => setDivTipo(e.target.value)}>
                    {FRACCION_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value={FRACCION_NUEVA}>+ Agregar nueva opción...</option>
                  </select>
                  {divTipo === FRACCION_NUEVA && (
                    <input className="inp text-sm" placeholder="Nombre de la nueva opción (ej: Por caja)"
                      value={divTipoNueva} onChange={e => setDivTipoNueva(e.target.value)} autoFocus/>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">P. Compra (Bs.)</label>
                      <input id="div_precio_compra" type="number" className="inp text-sm" placeholder="0.00" step="0.01" min="0"/>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">P. por Mayor (Bs.)</label>
                      <input id="div_precio_mayor" type="number" className="inp text-sm" placeholder="0.00" step="0.01" min="0"/>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">P. sin Factura (Bs.)</label>
                      <input id="div_precio_sin_factura" type="number" className="inp text-sm" placeholder="0.00" step="0.01" min="0"/>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">P. con Factura (Bs.)</label>
                      <input id="div_precio_facturado" type="number" className="inp text-sm" placeholder="0.00" step="0.01" min="0"/>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => {
                      const nombre   = (divTipo === FRACCION_NUEVA ? divTipoNueva : divTipo)?.trim()
                      const cantidad = 1
                      const precio_compra       = parseFloat(document.getElementById('div_precio_compra')?.value || 0)
                      const precio_mayor        = parseFloat(document.getElementById('div_precio_mayor')?.value || 0)
                      const precio_sin_factura  = parseFloat(document.getElementById('div_precio_sin_factura')?.value || 0)
                      const precio_facturado    = parseFloat(document.getElementById('div_precio_facturado')?.value || 0)
                      if (!nombre) return
                      set('divisiones', [...(form.divisiones||[]), { nombre, cantidad, precio_compra, precio_mayor, precio_sin_factura, precio_facturado }])
                      setDivTipo(FRACCION_TIPOS[0]); setDivTipoNueva('')
                      document.getElementById('div_precio_compra').value = ''
                      document.getElementById('div_precio_mayor').value = ''
                      document.getElementById('div_precio_sin_factura').value = ''
                      document.getElementById('div_precio_facturado').value = ''
                    }}
                    className="btn btn-sm justify-center" style={{background:'#3b82f6',color:'#fff',border:'none'}}>
                    <Plus size={13}/> Agregar fracción
                  </button>
                  {(form.divisiones||[]).length === 0 && (
                    <p className="text-xs text-blue-400 italic text-center">Sin fracciones aún</p>
                  )}
                </div>
              </div>
            )}
          </div>{/* fin flex row */}
        </Modal>
      )}

      {/* Modal ajuste de precios */}
      {modalAjuste && (
        <Modal title="Ajuste de precio" onClose={() => setModalAjuste(false)} size="max-w-2xl">
          <div className="flex gap-5">

            {/* Lista de productos */}
            <div className="w-64 shrink-0 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="lbl mb-0">Productos</label>
                <button onClick={toggleTodos} className="text-xs text-blue-600 hover:underline">
                  {seleccionados.size === productosFiltradosAjuste.length && productosFiltradosAjuste.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              </div>
              {/* Buscador */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-500">
                <Search size={13} className="text-slate-400 shrink-0"/>
                <input className="flex-1 text-xs bg-transparent outline-none placeholder-slate-400"
                  value={searchAjuste} onChange={e => setSearchAjuste(e.target.value)} placeholder="Buscar..."/>
                {searchAjuste && <button onClick={() => setSearchAjuste('')} className="text-slate-300 hover:text-slate-500"><X size={11}/></button>}
              </div>
              {/* Lista con checkboxes */}
              <div className="border border-slate-200 rounded-xl overflow-y-auto flex flex-col" style={{maxHeight:300}}>
                {productosFiltradosAjuste.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">Sin resultados</p>
                )}
                {productosFiltradosAjuste.map(p => (
                  <label key={p.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 ${seleccionados.has(p.id) ? 'bg-blue-50' : ''}`}>
                    <input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => toggleSeleccion(p.id)} className="accent-blue-600 shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{p.nombre}</p>
                      <p className="text-[10px] text-slate-400">Bs. {parseFloat(p.precio_mayor||0).toFixed(2)}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                {seleccionados.size > 0 ? <><strong className="text-blue-600">{seleccionados.size}</strong> seleccionados</> : <span>Sin selección = todos ({productos.length})</span>}
              </p>
            </div>

            {/* Controles */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Tipo */}
              <div>
                <label className="lbl">Tipo de ajuste</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setAj('tipo', 'incremento')}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 font-semibold text-sm transition-all ${ajuste.tipo === 'incremento' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-300'}`}>
                    <TrendingUp size={15}/> Incremento
                  </button>
                  <button onClick={() => setAj('tipo', 'reduccion')}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 font-semibold text-sm transition-all ${ajuste.tipo === 'reduccion' ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:border-red-300'}`}>
                    <TrendingDown size={15}/> Reducción
                  </button>
                </div>
              </div>

              {/* Campo */}
              <div>
                <label className="lbl">Precio a ajustar</label>
                <select className="inp" value={ajuste.campo} onChange={e => setAj('campo', e.target.value)}>
                  <option value="todos">Todos los precios</option>
                  <option value="precio_mayor">Precio Mayor</option>
                  <option value="precio_compra">Precio de Compra / Costo</option>
                  <option value="precio_facturado">Precio con Factura</option>
                  <option value="precio_sin_factura">Precio sin Factura</option>
                </select>
              </div>

              {/* Valor */}
              <div>
                <label className="lbl">Valor</label>
                <div className="flex gap-2 items-center">
                  <button onClick={() => setAj('modo', '%')} className={`px-3 py-2 rounded-lg border-2 text-sm font-bold transition-all ${ajuste.modo === '%' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>%</button>
                  <button onClick={() => setAj('modo', 'fijo')} className={`px-3 py-2 rounded-lg border-2 text-sm font-bold transition-all ${ajuste.modo === 'fijo' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>Bs.</button>
                  <input type="number" className="inp flex-1" min="0" step="0.01"
                    value={ajuste.valor} onChange={e => setAj('valor', e.target.value)}
                    placeholder={ajuste.modo === '%' ? 'Ej: 10' : 'Ej: 5.00'}/>
                </div>
              </div>

              {/* Preview */}
              {parseFloat(ajuste.valor) > 0 && (
                <div className={`rounded-lg p-3 text-sm ${ajuste.tipo === 'incremento' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {ajuste.tipo === 'incremento' ? '↑' : '↓'} <strong>{ajuste.tipo}</strong> de <strong>{ajuste.valor}{ajuste.modo}</strong> a <strong>{seleccionados.size > 0 ? seleccionados.size : productos.length} producto{(seleccionados.size > 0 ? seleccionados.size : productos.length) !== 1 ? 's' : ''}</strong>
                </div>
              )}

              <div className="flex gap-2 mt-auto pt-2">
                <button onClick={() => setModalAjuste(false)} className="btn btn-ghost flex-1">Cancelar</button>
                <button onClick={aplicarAjuste} disabled={aplicandoAjuste || !ajuste.valor || parseFloat(ajuste.valor) <= 0}
                  className={`btn flex-1 justify-center ${ajuste.tipo === 'incremento' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                  <Check size={16}/> {aplicandoAjuste ? 'Aplicando...' : 'Aplicar'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
