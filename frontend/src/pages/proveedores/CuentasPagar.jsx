import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus, X, Check, Trash2, AlertCircle, CreditCard } from 'lucide-react'
import dayjs from 'dayjs'

const FORMAS = ['efectivo','qr','tarjeta','transferencia']

export default function CuentasPagar() {
  const { tiendaActual, user } = useAuth()
  const [lista, setLista]         = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('pendiente')
  const [modal, setModal]         = useState(null) // 'nueva' | { cuenta }
  const [pagoModal, setPagoModal] = useState(null) // cuenta
  const [form, setForm]           = useState({ proveedor_id:'', concepto:'', monto_total:'', fecha:dayjs().format('YYYY-MM-DD'), fecha_vencimiento:'', notas:'' })
  const [pago, setPago]           = useState({ monto:'', forma_pago:'efectivo', notas:'' })
  const [saving, setSaving]       = useState(false)
  const set  = (k,v) => setForm(f=>({...f,[k]:v}))
  const setP = (k,v) => setPago(p=>({...p,[k]:v}))

  function cargar() {
    if (!tiendaActual) return
    setLoading(true)
    Promise.all([
      api.getCuentasPagar({ tienda_id: tiendaActual, estado: filtroEstado || undefined }),
      api.getProveedores(),
    ]).then(([c, p]) => { setLista(c); setProveedores(p) }).finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [tiendaActual, filtroEstado])

  async function guardarNueva() {
    if (!form.proveedor_id || !form.concepto || !form.monto_total) { alert('Completa proveedor, concepto y monto'); return }
    setSaving(true)
    try {
      await api.addCuentaPagar({ ...form, tienda_id: tiendaActual, monto_total: parseFloat(form.monto_total), usuario_id: user?.id })
      setModal(null)
      setForm({ proveedor_id:'', concepto:'', monto_total:'', fecha:dayjs().format('YYYY-MM-DD'), fecha_vencimiento:'', notas:'' })
      cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  async function registrarPago() {
    if (!pago.monto || parseFloat(pago.monto) <= 0) { alert('Ingresa un monto válido'); return }
    setSaving(true)
    try {
      await api.pagarCuenta(pagoModal.id, { ...pago, monto: parseFloat(pago.monto), usuario_id: user?.id })
      setPagoModal(null)
      setPago({ monto:'', forma_pago:'efectivo', notas:'' })
      cargar()
    } catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta deuda?')) return
    await api.deleteCuentaPagar(id)
    cargar()
  }

  const fmt = n => 'Bs. ' + parseFloat(n||0).toFixed(2)
  const totalPendiente = lista.reduce((s,c) => s + parseFloat(c.saldo||0), 0)

  const estadoColor = { pendiente:'badge-red', parcial:'badge-yellow', pagado:'badge-green' }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cuentas por Pagar</h1>
          <p className="text-sm text-slate-400 mt-0.5">Deudas pendientes a proveedores</p>
        </div>
        <button onClick={() => setModal('nueva')} className="btn btn-primary"><Plus size={15}/> Nueva deuda</button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label:'Pendiente total', value:fmt(lista.filter(c=>c.estado==='pendiente').reduce((s,c)=>s+parseFloat(c.saldo||0),0)), color:'text-red-600' },
          { label:'Parcialmente pagado', value:fmt(lista.filter(c=>c.estado==='parcial').reduce((s,c)=>s+parseFloat(c.saldo||0),0)), color:'text-amber-600' },
          { label:'N° cuentas activas', value:lista.filter(c=>c.estado!=='pagado').length, color:'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {[['','Todas'],['pendiente','Pendientes'],['parcial','Parciales'],['pagado','Pagadas']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltroEstado(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtroEstado===v?'bg-blue-600 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-16 text-center"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>
      ) : lista.length === 0 ? (
        <div className="card p-16 text-center">
          <CreditCard size={40} className="mx-auto text-slate-300 mb-3"/>
          <p className="text-slate-500">No hay cuentas por pagar</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table>
            <thead><tr>
              <th>Proveedor</th><th>Concepto</th><th>Total</th><th>Pagado</th><th>Saldo</th>
              <th>Vence</th><th>Estado</th><th></th>
            </tr></thead>
            <tbody>{lista.map(c => {
              const vencido = c.fecha_vencimiento && dayjs(c.fecha_vencimiento).isBefore(dayjs(), 'day') && c.estado !== 'pagado'
              return (
                <tr key={c.id} className={vencido ? 'bg-red-50' : ''}>
                  <td className="font-semibold">{c.proveedor_nombre}</td>
                  <td>
                    <p className="font-medium text-sm">{c.concepto}</p>
                    <p className="text-xs text-slate-400">{dayjs(c.fecha).format('DD/MM/YYYY')}</p>
                  </td>
                  <td className="font-mono">{fmt(c.monto_total)}</td>
                  <td className="font-mono text-emerald-600">{fmt(c.monto_pagado)}</td>
                  <td className={`font-mono font-bold ${parseFloat(c.saldo)>0?'text-red-600':'text-slate-400'}`}>{fmt(c.saldo)}</td>
                  <td>
                    {c.fecha_vencimiento ? (
                      <span className={`text-xs ${vencido?'text-red-600 font-bold':'text-slate-400'}`}>
                        {vencido && <AlertCircle size={12} className="inline mr-1"/>}
                        {dayjs(c.fecha_vencimiento).format('DD/MM/YY')}
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td><span className={`badge ${estadoColor[c.estado]||'badge-gray'}`}>{c.estado}</span></td>
                  <td>
                    <div className="flex gap-1">
                      {c.estado !== 'pagado' && (
                        <button onClick={() => { setPagoModal(c); setPago({ monto:parseFloat(c.saldo).toFixed(2), forma_pago:'efectivo', notas:'' }) }}
                          className="btn btn-sm btn-success">Pagar</button>
                      )}
                      <button onClick={() => eliminar(c.id)} className="text-red-400 hover:text-red-600 ml-1"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}

      {/* Modal nueva deuda */}
      {modal === 'nueva' && (
        <div className="modal-overlay"><div className="modal max-w-md w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-bold">Registrar deuda a proveedor</h2>
            <button onClick={() => setModal(null)}><X size={18} className="text-slate-400"/></button>
          </div>
          <div className="p-6 flex flex-col gap-3">
            <div>
              <label className="lbl">Proveedor *</label>
              <select className="inp" value={form.proveedor_id} onChange={e => set('proveedor_id',e.target.value)}>
                <option value="">Seleccionar...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Concepto *</label>
              <input className="inp" value={form.concepto} onChange={e => set('concepto',e.target.value)} placeholder="Ej: Compra de cemento a crédito" autoFocus/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="lbl">Monto total (Bs.) *</label>
                <input type="number" className="inp font-bold" value={form.monto_total} onChange={e => set('monto_total',e.target.value)} step="0.01" placeholder="0.00"/>
              </div>
              <div>
                <label className="lbl">Fecha</label>
                <input type="date" className="inp" value={form.fecha} onChange={e => set('fecha',e.target.value)}/>
              </div>
            </div>
            <div>
              <label className="lbl">Fecha de vencimiento (opcional)</label>
              <input type="date" className="inp" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento',e.target.value)}/>
            </div>
            <div>
              <label className="lbl">Notas</label>
              <input className="inp" value={form.notas} onChange={e => set('notas',e.target.value)} placeholder="Observaciones..."/>
            </div>
            <button onClick={guardarNueva} disabled={saving} className="btn btn-primary w-full justify-center py-3 mt-1">
              <Check size={16}/> {saving ? 'Guardando...' : 'Registrar deuda'}
            </button>
          </div>
        </div></div>
      )}

      {/* Modal registrar pago */}
      {pagoModal && (
        <div className="modal-overlay"><div className="modal max-w-sm w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="font-bold">Registrar pago</h2>
              <p className="text-xs text-slate-400">{pagoModal.proveedor_nombre} · {pagoModal.concepto}</p>
            </div>
            <button onClick={() => setPagoModal(null)}><X size={18} className="text-slate-400"/></button>
          </div>
          <div className="p-6 flex flex-col gap-3">
            <div className="bg-red-50 rounded-xl p-3 text-sm flex justify-between">
              <span className="text-slate-600">Saldo pendiente:</span>
              <span className="font-bold text-red-600">{fmt(pagoModal.saldo)}</span>
            </div>
            <div>
              <label className="lbl">Monto a pagar (Bs.) *</label>
              <input type="number" className="inp text-lg font-bold" value={pago.monto} onChange={e => setP('monto',e.target.value)} step="0.01" placeholder="0.00"/>
            </div>
            <div>
              <label className="lbl">Forma de pago</label>
              <div className="grid grid-cols-2 gap-2">
                {FORMAS.map(f => (
                  <button key={f} onClick={() => setP('forma_pago',f)}
                    className={`py-2 rounded-lg text-xs font-bold capitalize ${pago.forma_pago===f?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="lbl">Notas</label>
              <input className="inp" value={pago.notas} onChange={e => setP('notas',e.target.value)} placeholder="Observaciones..."/>
            </div>
            <button onClick={registrarPago} disabled={saving} className="btn btn-success w-full justify-center py-3 mt-1">
              <Check size={16}/> {saving ? 'Guardando...' : 'Confirmar pago'}
            </button>
          </div>
        </div></div>
      )}
    </div>
  )
}
