import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus, Edit, Trash2, X, Check, Store, Users, Warehouse, History, UserCheck, ShoppingCart, Package, CreditCard, Tag, Ruler, BookOpen } from 'lucide-react'

const TABS_ADMIN = [
  { id:'tiendas',     label:'Tiendas', icon:Store },
  { id:'usuarios',    label:'Usuarios',    icon:Users },
  { id:'categorias',  label:'Categorías',  icon:Tag },
  { id:'unidades',    label:'Unidades',    icon:Ruler },
  { id:'depositos',   label:'Dep. dinero', icon:Warehouse },
  { id:'empleados',   label:'Personal',    icon:UserCheck },
  { id:'registro',    label:'Reg. cambios',icon:History },
]
const TABS_ALL = [
  { id:'ventas_todas',   label:'Todas las ventas',   icon:ShoppingCart },
  { id:'compras_todas',  label:'Todas las compras',  icon:Package },
  { id:'recargas_todas', label:'Recargas',            icon:CreditCard },
]

export default function Configuracion() {
  const { isAdmin, tiendaActual } = useAuth()
  const [tab, setTab] = useState(isAdmin ? 'tiendas' : 'ventas_todas')

  const allTabs = isAdmin ? [...TABS_ADMIN, ...TABS_ALL] : TABS_ALL

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Configuración</h1>
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {allTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab===id?'border-blue-600 text-blue-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>
      {tab === 'tiendas'      && <TabTiendas />}
      {tab === 'usuarios'     && <TabUsuarios />}
      {tab === 'categorias'   && <TabCategorias tiendaActual={tiendaActual} />}
      {tab === 'unidades'     && <TabUnidades tiendaActual={tiendaActual} />}
      {tab === 'depositos'    && <TabDepositos tiendaActual={tiendaActual} />}
      {tab === 'empleados'    && <TabEmpleados tiendaActual={tiendaActual} />}
      {tab === 'registro'     && <TabRegistro tiendaActual={tiendaActual} />}
      {tab === 'ventas_todas' && <TabTodasVentas tiendaActual={tiendaActual} />}
      {tab === 'compras_todas'&& <TabTodasCompras tiendaActual={tiendaActual} />}
      {tab === 'recargas_todas'&& <TabTodasRecargas tiendaActual={tiendaActual} />}
    </div>
  )
}

/* ─── Tiendas ─────────────────────────────── */
function TabTiendas() {
  const { setTiendaLogo, tiendaActual } = useAuth()
  const [lista, setLista]       = useState([])
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState({ nombre:'', direccion:'', telefono:'' })
  const [saving, setSaving]     = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(null)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const cargar = () => api.getTiendas({ tipo: 'sucursal' }).then(t => setLista(t))
  useEffect(() => { cargar() }, [])

  async function guardarTienda() {
    if (!form.nombre?.trim()) return alert('El nombre es requerido')
    setSaving(true)
    try {
      if (modal === 'editar-tienda') await api.updateTienda(form.id, { ...form, tipo: 'sucursal' })
      else await api.addTienda({ ...form, tipo: 'sucursal' })
      setModal(null); cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  async function subirLogo(tienda, file) {
    if (!file) return
    setUploadingLogo(tienda.id)
    try {
      const fd = new FormData()
      fd.append('nombre', tienda.nombre)
      fd.append('tipo', 'sucursal')
      fd.append('logo', file)
      const res = await api.uploadLogoTienda(tienda.id, fd)
      if (tienda.id === tiendaActual && res.logo) setTiendaLogo(res.logo)
      cargar()
    } catch(e) { alert(e.message) } finally { setUploadingLogo(null) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-700">Tiendas / Sucursales</h2>
          <p className="text-xs text-slate-400 mt-0.5">Al crear una tienda nueva hereda los productos de Boxer con stock 0.</p>
        </div>
        <button onClick={() => { setForm({ nombre:'', direccion:'', telefono:'' }); setModal('crear-tienda') }} className="btn btn-primary btn-sm"><Plus size={14}/> Nueva tienda</button>
      </div>

      {lista.length === 0 && (
        <div className="card p-10 text-center text-slate-400 text-sm">Sin tiendas creadas</div>
      )}

      <div className="flex flex-col gap-3">
        {lista.map(t => (
          <div key={t.id} className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50">
              <div className="flex items-center gap-3">
                {/* Logo preview */}
                <label className="cursor-pointer group relative" title="Haz clic para cambiar el logo">
                  <div className="w-12 h-12 rounded-xl border-2 border-dashed border-blue-200 bg-white flex items-center justify-center overflow-hidden group-hover:border-blue-400 transition-colors">
                    {uploadingLogo === t.id
                      ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                      : t.logo
                        ? <img src={t.logo} alt="logo" className="w-full h-full object-contain"/>
                        : <span className="text-xl font-bold text-blue-300">{t.nombre[0]}</span>
                    }
                  </div>
                  <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[10px] font-semibold">Logo</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={e => subirLogo(t, e.target.files[0])} />
                </label>
                <div>
                  <span className="font-semibold text-slate-800">{t.nombre}</span>
                  {t.direccion && <p className="text-xs text-slate-400">{t.direccion}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setForm({...t}); setModal('editar-tienda') }} className="btn btn-ghost btn-sm py-1 px-2"><Edit size={13}/></button>
                <button onClick={async () => { if (!confirm(`¿Eliminar la tienda "${t.nombre}"?`)) return; await api.deleteTienda(t.id); cargar() }} className="btn btn-danger btn-sm py-1 px-2"><Trash2 size={13}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(modal === 'crear-tienda' || modal === 'editar-tienda') && (
        <FormModal title={modal === 'editar-tienda' ? 'Editar Tienda' : 'Nueva Tienda'} onClose={() => setModal(null)} onSave={guardarTienda} saving={saving}>
          <Field label="Nombre *"><input className="inp" value={form.nombre} onChange={e => set('nombre',e.target.value)} autoFocus /></Field>
          <Field label="Dirección"><input className="inp" value={form.direccion||''} onChange={e => set('direccion',e.target.value)} /></Field>
          <Field label="Teléfono"><input className="inp" value={form.telefono||''} onChange={e => set('telefono',e.target.value)} /></Field>
          {modal === 'crear-tienda' && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded p-2">La tienda se creará con todos los productos de Boxer con stock 0.</p>
          )}
        </FormModal>
      )}
    </div>
  )
}

/* ─── Usuarios ────────────────────────────── */
function TabUsuarios() {
  const [lista, setLista] = useState([])
  const [modal, setModal] = useState(null)
  const [tiendas, setTiendas] = useState([])
  const [form, setForm]   = useState({ nombre:'', username:'', password:'', rol:'vendedor', tienda_id:'', horario_inicio:'', horario_fin:'', bloqueado:0 })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const cargar = () => Promise.all([api.getUsuarios(), api.getTiendas()]).then(([u,t]) => { setLista(u); setTiendas(t) })
  useEffect(() => { cargar() }, [])

  async function guardar() {
    setSaving(true)
    try {
      if (modal==='crear') await api.addUsuario(form); else await api.updateUsuario(form.id, form)
      setModal(null); cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  async function toggleBloqueo(u) {
    await api.updateUsuario(u.id, { ...u, password:'', bloqueado: u.bloqueado ? 0 : 1 })
    cargar()
  }

  const BADGE_ROL = { admin:'badge-blue', gerente:'badge-orange', vendedor:'badge-gray' }

  return (
    <Section title="Usuarios" onNew={() => { setForm({ nombre:'', username:'', password:'', rol:'vendedor', tienda_id:'', horario_inicio:'', horario_fin:'', bloqueado:0 }); setModal('crear') }}>
      <table>
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Tienda</th><th>Horario</th><th>Estado</th><th></th></tr></thead>
        <tbody>{lista.map(u => (
          <tr key={u.id}>
            <td className="font-medium">{u.nombre}</td>
            <td className="font-mono text-xs text-slate-600">{u.username}</td>
            <td><span className={`badge ${BADGE_ROL[u.rol]||'badge-gray'}`}>{u.rol}</span></td>
            <td className="text-slate-500 text-xs">{u.tienda_nombre||'Todas'}</td>
            <td className="text-slate-400 text-xs">{u.horario_inicio ? `${u.horario_inicio.slice(0,5)} - ${u.horario_fin?.slice(0,5)}` : '—'}</td>
            <td>
              <button onClick={() => toggleBloqueo(u)} className={`badge cursor-pointer ${u.bloqueado ? 'badge-red' : 'badge-green'}`}>
                {u.bloqueado ? '🔒 Bloqueado' : '✓ Activo'}
              </button>
            </td>
            <td><button onClick={() => { setForm({...u, password:'', horario_inicio:u.horario_inicio||'', horario_fin:u.horario_fin||''}); setModal('editar') }} className="btn btn-ghost btn-sm py-1 px-2"><Edit size={14}/></button></td>
          </tr>
        ))}</tbody>
      </table>
      {modal && <FormModal title={modal==='crear'?'Nuevo Usuario':'Editar Usuario'} onClose={() => setModal(null)} onSave={guardar} saving={saving}>
        <Field label="Nombre *"><input className="inp" value={form.nombre} onChange={e => set('nombre',e.target.value)} autoFocus /></Field>
        <Field label="Usuario *"><input className="inp" value={form.username} onChange={e => set('username',e.target.value)} /></Field>
        <Field label={modal==='crear'?'Contraseña *':'Nueva contraseña (dejar vacío para no cambiar)'}><input type="password" className="inp" value={form.password} onChange={e => set('password',e.target.value)} /></Field>
        <Field label="Rol">
          <select className="inp" value={form.rol} onChange={e => set('rol',e.target.value)}>
            <option value="vendedor">Vendedor — ventas, caja, clientes, productos</option>
            <option value="gerente">Gerente — todo excepto gestión de usuarios</option>
            <option value="admin">Admin — acceso total</option>
          </select>
        </Field>
        <Field label="Tienda asignada">
          <select className="inp" value={form.tienda_id||''} onChange={e => set('tienda_id',e.target.value)}>
            <option value="">Todas las tiendas</option>
            {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hora entrada (horario laboral)"><input type="time" className="inp" value={form.horario_inicio||''} onChange={e => set('horario_inicio',e.target.value)} /></Field>
          <Field label="Hora salida (horario laboral)"><input type="time" className="inp" value={form.horario_fin||''} onChange={e => set('horario_fin',e.target.value)} /></Field>
        </div>
        <p className="text-xs text-slate-400">Si se define horario, el usuario no podrá ingresar al sistema fuera de ese rango. Dejar vacío para sin restricción.</p>
        <Field label="Estado">
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => set('bloqueado',0)} className={`flex-1 py-2 rounded text-xs font-bold ${!form.bloqueado?'bg-emerald-600 text-white':'bg-slate-100 text-slate-500'}`}>✓ Activo</button>
            <button type="button" onClick={() => set('bloqueado',1)} className={`flex-1 py-2 rounded text-xs font-bold ${form.bloqueado?'bg-red-600 text-white':'bg-slate-100 text-slate-500'}`}>🔒 Bloqueado</button>
          </div>
        </Field>
      </FormModal>}
    </Section>
  )
}

/* ─── Catálogo global ─────────────────────── */
function TabCatalogo({ tiendaActual }) {
  const [lista, setLista]       = useState([])
  const [categorias, setCats]   = useState([])
  const [modal, setModal]       = useState(null)  // null | 'crear' | item
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [buscar, setBuscar]     = useState('')
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const cargar = () => Promise.all([
    api.getCatalogo({ q: buscar }),
    api.getCategorias(),
  ]).then(([prods, cats]) => { setLista(prods); setCats(cats) })

  useEffect(() => { cargar() }, [buscar])

  const formVacio = {
    codigo:'', nombre:'', descripcion:'', categoria_id:'', unidad:'Unidad',
    precio_compra:0, precio_mayor:0, precio_facturado:0, precio_sin_factura:0,
    stock_minimo:0, stock_maximo:0, permite_dividir:0,
  }

  async function guardar() {
    if (!form.nombre?.trim()) return alert('El nombre es requerido')
    setSaving(true)
    try {
      if (modal === 'crear') await api.addCatalogo(form)
      else await api.updateCatalogo(form.id, form)
      setModal(null); cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar del catálogo? Las copias existentes en sucursales no se borran.')) return
    await api.deleteCatalogo(id); cargar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-700">Catálogo global de productos</h2>
          <p className="text-xs text-slate-400 mt-0.5">Base de datos maestra — al crear una sucursal, estos productos se copian con stock 0</p>
        </div>
        <button onClick={() => { setForm(formVacio); setModal('crear') }} className="btn btn-primary btn-sm">
          <Plus size={14}/> Nuevo producto
        </button>
      </div>

      <div className="mb-3">
        <input value={buscar} onChange={e => setBuscar(e.target.value)}
          placeholder="Buscar por nombre..." className="inp py-1.5 text-sm w-64" />
      </div>

      <div className="card">
        {lista.length === 0
          ? <div className="p-10 text-center text-slate-400 text-sm">Sin productos en el catálogo</div>
          : <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Categoría</th>
                    <th>Unidad</th>
                    <th className="text-right">Precio compra</th>
                    <th className="text-right">Precio mayor</th>
                    <th className="text-right">P. facturado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(p => (
                    <tr key={p.id}>
                      <td className="font-medium">{p.nombre}</td>
                      <td className="font-mono text-xs text-slate-500">{p.codigo||'—'}</td>
                      <td className="text-slate-500">{p.categoria_nombre||'—'}</td>
                      <td className="text-slate-500">{p.unidad||'—'}</td>
                      <td className="text-right font-mono text-xs">Bs. {parseFloat(p.precio_compra||0).toFixed(2)}</td>
                      <td className="text-right font-mono text-xs">Bs. {parseFloat(p.precio_mayor||0).toFixed(2)}</td>
                      <td className="text-right font-mono text-xs">Bs. {parseFloat(p.precio_facturado||0).toFixed(2)}</td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => { setForm({...p}); setModal('editar') }} className="btn btn-ghost btn-sm py-1 px-2"><Edit size={14}/></button>
                          <button onClick={() => eliminar(p.id)} className="btn btn-danger btn-sm py-1 px-2"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </div>

      {modal && (
        <FormModal
          title={modal === 'crear' ? 'Nuevo producto en catálogo' : 'Editar producto del catálogo'}
          onClose={() => setModal(null)} onSave={guardar} saving={saving}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre *"><input className="inp" value={form.nombre||''} onChange={e => set('nombre',e.target.value)} autoFocus /></Field>
            <Field label="Código / SKU"><input className="inp" value={form.codigo||''} onChange={e => set('codigo',e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <select className="inp" value={form.categoria_id||''} onChange={e => set('categoria_id',e.target.value||null)}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Field>
            <Field label="Unidad"><input className="inp" value={form.unidad||'Unidad'} onChange={e => set('unidad',e.target.value)} placeholder="Unidad, Kg, Saco..." /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio compra (Bs.)"><input type="number" className="inp" value={form.precio_compra||0} onChange={e => set('precio_compra',e.target.value)} step="0.01" min="0" /></Field>
            <Field label="Precio mayor (Bs.)"><input type="number" className="inp" value={form.precio_mayor||0} onChange={e => set('precio_mayor',e.target.value)} step="0.01" min="0" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio facturado (Bs.)"><input type="number" className="inp" value={form.precio_facturado||0} onChange={e => set('precio_facturado',e.target.value)} step="0.01" min="0" /></Field>
            <Field label="Precio sin factura (Bs.)"><input type="number" className="inp" value={form.precio_sin_factura||0} onChange={e => set('precio_sin_factura',e.target.value)} step="0.01" min="0" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock mínimo"><input type="number" className="inp" value={form.stock_minimo||0} onChange={e => set('stock_minimo',e.target.value)} step="0.01" min="0" /></Field>
            <Field label="Stock máximo"><input type="number" className="inp" value={form.stock_maximo||0} onChange={e => set('stock_maximo',e.target.value)} step="0.01" min="0" /></Field>
          </div>
          <Field label="Descripción"><textarea className="inp" rows={2} value={form.descripcion||''} onChange={e => set('descripcion',e.target.value)} /></Field>
          <p className="text-xs text-slate-400">El stock no se define aquí — se asigna a cada sucursal al momento de crear o via traspasos.</p>
        </FormModal>
      )}
    </div>
  )
}

/* ─── Depósitos ───────────────────────────── */
function TabDepositos({ tiendaActual }) {
  const [lista, setLista] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm]   = useState({ nombre:'', descripcion:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const cargar = () => { if (!tiendaActual) return; api.getDepositos({ tienda_id: tiendaActual }).then(setLista) }
  useEffect(() => { cargar() }, [tiendaActual])

  async function guardar() {
    setSaving(true)
    try {
      if (modal==='crear') await api.addDeposito({ ...form, tienda_id: tiendaActual }); else await api.updateDeposito(form.id, form)
      setModal(null); cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  return (
    <Section title="Depósitos de dinero" onNew={() => { setForm({ nombre:'', descripcion:'' }); setModal('crear') }}>
      <table><thead><tr><th>Nombre</th><th>Descripción</th><th>Saldo</th><th></th></tr></thead>
        <tbody>{lista.map(d => (
          <tr key={d.id}>
            <td className="font-medium">{d.nombre}</td>
            <td className="text-slate-500">{d.descripcion||'—'}</td>
            <td className="font-bold font-mono">Bs. {parseFloat(d.saldo||0).toFixed(2)}</td>
            <td><div className="flex gap-1">
              <button onClick={() => { setForm(d); setModal('editar') }} className="btn btn-ghost btn-sm py-1 px-2"><Edit size={14}/></button>
              <button onClick={async () => { if(confirm('¿Eliminar depósito?')) { await api.deleteDeposito(d.id); cargar() } }} className="btn btn-danger btn-sm py-1 px-2"><Trash2 size={14}/></button>
            </div></td>
          </tr>
        ))}</tbody>
      </table>
      {modal && <FormModal title={modal==='crear'?'Nuevo Depósito':'Editar Depósito'} onClose={() => setModal(null)} onSave={guardar} saving={saving}>
        <Field label="Nombre *"><input className="inp" value={form.nombre} onChange={e => set('nombre',e.target.value)} autoFocus /></Field>
        <Field label="Descripción"><input className="inp" value={form.descripcion||''} onChange={e => set('descripcion',e.target.value)} /></Field>
      </FormModal>}
    </Section>
  )
}

/* ─── Empleados ───────────────────────────── */
function TabEmpleados({ tiendaActual }) {
  const [lista, setLista] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm]   = useState({ nombre:'', cargo:'', telefono:'', salario:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const cargar = () => { if (!tiendaActual) return; api.getEmpleados({ tienda_id: tiendaActual }).then(setLista) }
  useEffect(() => { cargar() }, [tiendaActual])

  async function guardar() {
    setSaving(true)
    try {
      if (modal==='crear') await api.addEmpleado({ ...form, tienda_id: tiendaActual }); else await api.updateEmpleado(form.id, form)
      setModal(null); cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  return (
    <Section title="Personal / Empleados" onNew={() => { setForm({ nombre:'', cargo:'', telefono:'', salario:'' }); setModal('crear') }}>
      <table><thead><tr><th>Nombre</th><th>Cargo</th><th>Teléfono</th><th>Salario</th><th></th></tr></thead>
        <tbody>{lista.map(e => (
          <tr key={e.id}>
            <td className="font-medium">{e.nombre}</td>
            <td className="text-slate-500">{e.cargo||'—'}</td>
            <td className="text-slate-500">{e.telefono||'—'}</td>
            <td className="font-mono">Bs. {parseFloat(e.salario||0).toFixed(2)}</td>
            <td><div className="flex gap-1">
              <button onClick={() => { setForm(e); setModal('editar') }} className="btn btn-ghost btn-sm py-1 px-2"><Edit size={14}/></button>
              <button onClick={async () => { if(confirm('¿Eliminar?')) { await api.deleteEmpleado(e.id); cargar() } }} className="btn btn-danger btn-sm py-1 px-2"><Trash2 size={14}/></button>
            </div></td>
          </tr>
        ))}</tbody>
      </table>
      {modal && <FormModal title={modal==='crear'?'Nuevo Empleado':'Editar Empleado'} onClose={() => setModal(null)} onSave={guardar} saving={saving}>
        <Field label="Nombre *"><input className="inp" value={form.nombre} onChange={e => set('nombre',e.target.value)} autoFocus /></Field>
        <Field label="Cargo"><input className="inp" value={form.cargo||''} onChange={e => set('cargo',e.target.value)} /></Field>
        <Field label="Teléfono"><input className="inp" value={form.telefono||''} onChange={e => set('telefono',e.target.value)} /></Field>
        <Field label="Salario (Bs.)"><input type="number" className="inp" value={form.salario||''} onChange={e => set('salario',e.target.value)} step="0.01" /></Field>
      </FormModal>}
    </Section>
  )
}

/* ─── Registro de cambios ─────────────────── */
function TabRegistro({ tiendaActual }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const cargar = () => { if (!tiendaActual) return; setLoading(true); api.getRegistroCambios({ tienda_id: tiendaActual }).then(setLista).finally(() => setLoading(false)) }
  useEffect(() => { cargar() }, [tiendaActual])
  return (
    <div className="card">
      {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
      : lista.length === 0 ? <div className="p-12 text-center text-slate-400">Sin registros</div>
      : <table><thead><tr><th>Módulo</th><th>Acción</th><th>Descripción</th><th>Usuario</th><th>Fecha</th></tr></thead>
          <tbody>{lista.map(r => (
            <tr key={r.id}>
              <td><span className="badge badge-blue capitalize">{r.modulo}</span></td>
              <td className="text-slate-600 capitalize">{r.accion}</td>
              <td className="text-slate-500 text-xs max-w-xs truncate">{r.descripcion}</td>
              <td className="text-slate-400 text-xs">{r.usuario_nombre}</td>
              <td className="text-slate-400 text-xs">{new Date(r.created_at).toLocaleString()}</td>
            </tr>
          ))}</tbody>
        </table>}
    </div>
  )
}

/* ─── Todas las ventas ────────────────────── */
function TabTodasVentas({ tiendaActual }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState(new Date().toISOString().slice(0,10))
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0,10))
  const cargar = () => { if (!tiendaActual) return; setLoading(true); api.getVentas({ tienda_id: tiendaActual, desde, hasta }).then(setLista).finally(() => setLoading(false)) }
  useEffect(() => { cargar() }, [tiendaActual, desde, hasta])
  return (
    <div>
      <div className="flex gap-2 mb-4"><input type="date" className="inp py-1.5 text-sm" value={desde} onChange={e => setDesde(e.target.value)} /><span className="text-slate-400">—</span><input type="date" className="inp py-1.5 text-sm" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
      <div className="card">
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
        : <table><thead><tr><th>N°</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>{lista.map(v => <tr key={v.id}><td className="font-mono text-xs font-bold text-blue-600">{v.numero}</td><td>{v.cliente_nombre||'—'}</td><td className="font-bold">Bs. {parseFloat(v.total).toFixed(2)}</td><td><span className={`badge ${v.estado==='activo'?'badge-green':'badge-red'}`}>{v.estado}</span></td><td className="text-slate-400 text-xs">{new Date(v.fecha).toLocaleString()}</td></tr>)}</tbody>
          </table>}
      </div>
    </div>
  )
}

/* ─── Todas las compras ───────────────────── */
function TabTodasCompras({ tiendaActual }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState(new Date().toISOString().slice(0,10))
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0,10))
  const cargar = () => { if (!tiendaActual) return; setLoading(true); api.getCompras({ tienda_id: tiendaActual, desde, hasta }).then(setLista).finally(() => setLoading(false)) }
  useEffect(() => { cargar() }, [tiendaActual, desde, hasta])
  return (
    <div>
      <div className="flex gap-2 mb-4"><input type="date" className="inp py-1.5 text-sm" value={desde} onChange={e => setDesde(e.target.value)} /><span className="text-slate-400">—</span><input type="date" className="inp py-1.5 text-sm" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
      <div className="card">
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
        : <table><thead><tr><th>N°</th><th>Proveedor</th><th>Total</th><th>Fecha</th></tr></thead>
            <tbody>{lista.map(c => <tr key={c.id}><td className="font-mono text-xs font-bold text-blue-600">{c.numero}</td><td>{c.proveedor_nombre||'—'}</td><td className="font-bold">Bs. {parseFloat(c.total).toFixed(2)}</td><td className="text-slate-400 text-xs">{new Date(c.fecha).toLocaleString()}</td></tr>)}</tbody>
          </table>}
      </div>
    </div>
  )
}

/* ─── Todas las recargas ──────────────────── */
function TabTodasRecargas({ tiendaActual }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const cargar = () => { if (!tiendaActual) return; setLoading(true); api.getTarjetas({ tienda_id: tiendaActual }).then(setLista).finally(() => setLoading(false)) }
  useEffect(() => { cargar() }, [tiendaActual])
  return (
    <div className="card">
      {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
      : <table><thead><tr><th>Tipo</th><th>Descripción</th><th>Cliente</th><th>Monto</th><th>Fecha</th></tr></thead>
          <tbody>{lista.map(t => <tr key={t.id}><td><span className="badge badge-blue">{t.tipo?.replace(/_/g,' ')}</span></td><td>{t.descripcion||'—'}</td><td>{t.cliente_nombre||'—'}</td><td className="font-bold">Bs. {parseFloat(t.monto).toFixed(2)}</td><td className="text-slate-400 text-xs">{new Date(t.fecha).toLocaleString()}</td></tr>)}</tbody>
        </table>}
    </div>
  )
}

/* ─── Helpers ─────────────────────────────── */
function Section({ title, onNew, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-700">{title}</h2>
        {onNew && <button onClick={onNew} className="btn btn-primary btn-sm"><Plus size={14}/> Nuevo</button>}
      </div>
      <div className="card">{children}</div>
    </div>
  )
}

function FormModal({ title, onClose, onSave, saving, children }) {
  return (
    <div className="modal-overlay"><div className="modal max-w-md w-full">
      <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-bold">{title}</h2><button onClick={onClose}><X size={18} className="text-slate-400"/></button></div>
      <div className="p-6 flex flex-col gap-3">
        {children}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancelar</button>
          <button onClick={onSave} disabled={saving} className="btn btn-primary flex-1 justify-center"><Check size={16}/> {saving?'Guardando...':'Guardar'}</button>
        </div>
      </div>
    </div></div>
  )
}

function Field({ label, children }) {
  return <div><label className="lbl">{label}</label>{children}</div>
}

/* ─── Unidades ───────────────────────────────── */
function TabUnidades({ tiendaActual }) {
  const [lista, setLista]   = useState([])
  const [modal, setModal]   = useState(null)
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)

  const cargar = () => api.getUnidades({ tienda_id: tiendaActual }).then(setLista)
  useEffect(() => { cargar() }, [tiendaActual])

  async function guardar() {
    if (!nombre.trim()) return
    setSaving(true)
    try {
      if (modal === 'nueva') {
        await api.addUnidad({ nombre: nombre.trim(), tienda_id: tiendaActual })
      } else {
        await api.updateUnidad(modal.id, { nombre: nombre.trim() })
      }
      setModal(null); setNombre(''); cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar unidad? Los productos asociados quedarán con la unidad registrada.')) return
    await api.deleteUnidad(id); cargar()
  }

  return (
    <Section title="Unidades de medida" onNew={() => { setModal('nueva'); setNombre('') }}>
      {lista.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">No hay unidades</div>
      ) : (
        <table>
          <thead><tr><th>Nombre</th><th></th></tr></thead>
          <tbody>{lista.map(u => (
            <tr key={u.id}>
              <td className="font-medium">{u.nombre}</td>
              <td>
                <div className="flex gap-1 justify-end">
                  <button onClick={() => { setModal(u); setNombre(u.nombre) }} className="text-blue-500 hover:text-blue-700"><Edit size={14}/></button>
                  <button onClick={() => eliminar(u.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {modal && (
        <FormModal title={modal === 'nueva' ? 'Nueva unidad' : 'Editar unidad'} onClose={() => setModal(null)} onSave={guardar} saving={saving}>
          <Field label="Nombre *">
            <input className="inp" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Kg, Saco 50kg, Metro" autoFocus onKeyDown={e => e.key==='Enter' && guardar()}/>
          </Field>
        </FormModal>
      )}
    </Section>
  )
}

/* ─── Categorías ─────────────────────────────── */
function TabCategorias({ tiendaActual }) {
  const [lista, setLista]   = useState([])
  const [modal, setModal]   = useState(null) // null | 'nueva' | item
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)

  const cargar = () => api.getCategorias().then(d => setLista(d.filter(c => !tiendaActual || !c.tienda_id || c.tienda_id == tiendaActual)))
  useEffect(() => { cargar() }, [tiendaActual])

  async function guardar() {
    if (!nombre.trim()) return
    setSaving(true)
    try {
      if (modal === 'nueva') {
        await api.addCategoria({ nombre: nombre.trim(), tienda_id: tiendaActual })
      } else {
        await api.updateCategoria(modal.id, { nombre: nombre.trim() })
      }
      setModal(null); setNombre(''); cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar categoría? Los productos asociados quedarán sin categoría.')) return
    await api.deleteCategoria(id); cargar()
  }

  return (
    <Section title="Categorías de productos" onNew={() => { setModal('nueva'); setNombre('') }}>
      {lista.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">No hay categorías</div>
      ) : (
        <table>
          <thead><tr><th>Nombre</th><th></th></tr></thead>
          <tbody>{lista.map(c => (
            <tr key={c.id}>
              <td className="font-medium">{c.nombre}</td>
              <td>
                <div className="flex gap-1 justify-end">
                  <button onClick={() => { setModal(c); setNombre(c.nombre) }} className="text-blue-500 hover:text-blue-700"><Edit size={14}/></button>
                  <button onClick={() => eliminar(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {modal && (
        <FormModal title={modal === 'nueva' ? 'Nueva categoría' : 'Editar categoría'} onClose={() => setModal(null)} onSave={guardar} saving={saving}>
          <Field label="Nombre *">
            <input className="inp" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Cemento y Mortero" autoFocus onKeyDown={e => e.key==='Enter' && guardar()}/>
          </Field>
        </FormModal>
      )}
    </Section>
  )
}
