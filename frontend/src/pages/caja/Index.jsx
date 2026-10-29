import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { TrendingUp, TrendingDown, DollarSign, Lock, Unlock, Plus, X, Check, Trash2 } from 'lucide-react'
import dayjs from 'dayjs'

export default function Caja() {
  const { tiendaActual } = useAuth()
  const [caja, setCaja]           = useState(null)
  const [lista, setLista]         = useState([])
  const [depositos, setDepositos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null) // 'abrir'|'cerrar'|'ingreso'|'egreso'
  const [form, setForm]           = useState({ concepto:'', monto:'', forma_pago:'efectivo', deposito_id:'', notas:'' })
  const [montoCierre, setMontoCierre] = useState('')
  const [saving, setSaving]       = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  function cargar() {
    if (!tiendaActual) return
    setLoading(true)
    Promise.all([
      api.getCajaActual({ tienda_id: tiendaActual }),
      api.getIngresosEgresos({ tienda_id: tiendaActual, desde: dayjs().format('YYYY-MM-DD'), hasta: dayjs().format('YYYY-MM-DD') }),
      api.getDepositos({ tienda_id: tiendaActual }),
    ]).then(([c, l, d]) => { setCaja(c); setLista(l); setDepositos(d) }).finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [tiendaActual])

  async function abrirCaja() {
    setSaving(true)
    try { await api.abrirCaja({ tienda_id: tiendaActual, monto_apertura: parseFloat(form.monto)||0 }); setModal(null); cargar() }
    catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function cerrarCaja() {
    if (!caja) return
    setSaving(true)
    try { await api.cerrarCaja(caja.id, { monto_cierre: parseFloat(montoCierre)||0 }); setModal(null); cargar() }
    catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function addMovimiento(tipo) {
    if (!form.concepto || !form.monto) { alert('Completa concepto y monto'); return }
    setSaving(true)
    try {
      await api.addIngresoEgreso({ tipo, concepto: form.concepto, monto: parseFloat(form.monto), forma_pago: form.forma_pago, deposito_id: form.deposito_id||null, tienda_id: tiendaActual, notas: form.notas })
      setModal(null); setForm({ concepto:'', monto:'', forma_pago:'efectivo', deposito_id:'', notas:'' }); cargar()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const totalIngresos = lista.filter(i => i.tipo==='ingreso').reduce((s,i) => s+parseFloat(i.monto||0), 0)
  const totalEgresos  = lista.filter(i => i.tipo==='egreso').reduce((s,i) => s+parseFloat(i.monto||0), 0)
  const fmt = n => 'Bs. ' + parseFloat(n||0).toFixed(2)

  if (loading) return <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Caja</h1>
        {!caja ? (
          <button onClick={() => { setForm(f=>({...f,monto:''})); setModal('abrir') }} className="btn btn-success"><Unlock size={16}/> Abrir Caja</button>
        ) : (
          <button onClick={() => setModal('cerrar')} className="btn btn-danger"><Lock size={16}/> Cerrar Caja</button>
        )}
      </div>

      {!caja && (
        <div className="card p-12 text-center">
          <Lock size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">No hay caja abierta</p>
          <p className="text-slate-400 text-sm">Abre la caja para registrar movimientos</p>
        </div>
      )}

      {caja && (
        <>
          {/* Resumen caja */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label:'Apertura', value:fmt(caja.monto_apertura), icon:Unlock, color:'text-blue-600' },
              { label:'Ventas del día', value:fmt(caja.total_ventas), icon:TrendingUp, color:'text-emerald-600' },
              { label:'Compras del día', value:fmt(caja.total_compras), icon:TrendingDown, color:'text-orange-500' },
              { label:'Saldo actual', value:fmt(caja.saldo_actual), icon:DollarSign, color:'text-blue-700' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-4">
                <Icon size={18} className={`mb-2 ${color}`}/>
                <p className="text-xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Botones movimiento */}
          <div className="flex gap-3 mb-4">
            <button onClick={() => { setForm({ concepto:'', monto:'', forma_pago:'efectivo', deposito_id:'', notas:'' }); setModal('ingreso') }} className="btn btn-success"><TrendingUp size={16}/> Registrar Ingreso</button>
            <button onClick={() => { setForm({ concepto:'', monto:'', forma_pago:'efectivo', deposito_id:'', notas:'' }); setModal('egreso') }} className="btn btn-danger"><TrendingDown size={16}/> Registrar Egreso</button>
          </div>

          {/* Lista movimientos del día */}
          <div className="card">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="font-semibold text-slate-700">Movimientos de hoy</p>
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-600 font-semibold">↑ {fmt(totalIngresos)}</span>
                <span className="text-red-500 font-semibold">↓ {fmt(totalEgresos)}</span>
              </div>
            </div>
            {lista.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">Sin movimientos hoy</div>
            : <table>
                <thead><tr><th>Tipo</th><th>Concepto</th><th>Monto</th><th>Forma pago</th><th>Hora</th><th></th></tr></thead>
                <tbody>{lista.map(i => (
                  <tr key={i.id}>
                    <td><span className={`badge ${i.tipo==='ingreso'?'badge-green':'badge-red'}`}>{i.tipo==='ingreso'?'↑ Ingreso':'↓ Egreso'}</span></td>
                    <td className="font-medium">{i.concepto}</td>
                    <td className={`font-bold ${i.tipo==='ingreso'?'text-emerald-600':'text-red-500'}`}>{fmt(i.monto)}</td>
                    <td className="capitalize text-slate-500">{i.forma_pago}</td>
                    <td className="text-slate-400 text-xs">{dayjs(i.fecha).format('HH:mm')}</td>
                    <td><button onClick={async () => { if(confirm('¿Eliminar?')) { await api.deleteIngresoEgreso(i.id); cargar() } }} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                  </tr>
                ))}</tbody>
              </table>}
          </div>
        </>
      )}

      {/* Modal abrir caja */}
      {modal === 'abrir' && (
        <div className="modal-overlay"><div className="modal max-w-sm w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-bold">Abrir Caja</h2><button onClick={() => setModal(null)}><X size={18} className="text-slate-400"/></button></div>
          <div className="p-6 flex flex-col gap-4">
            <div><label className="lbl">Monto de apertura (Bs.)</label><input type="number" className="inp text-lg font-bold" value={form.monto} onChange={e => set('monto',e.target.value)} placeholder="0.00" step="0.01" autoFocus /></div>
            <button onClick={abrirCaja} disabled={saving} className="btn btn-success w-full justify-center py-3"><Unlock size={16}/> {saving?'Abriendo...':'Abrir Caja'}</button>
          </div>
        </div></div>
      )}

      {/* Modal cerrar caja */}
      {modal === 'cerrar' && caja && (
        <div className="modal-overlay"><div className="modal max-w-sm w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-bold">Cerrar Caja</h2><button onClick={() => setModal(null)}><X size={18} className="text-slate-400"/></button></div>
          <div className="p-6 flex flex-col gap-4">
            <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Saldo calculado:</span><span className="font-bold">{fmt(caja.saldo_actual)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ventas:</span><span className="text-emerald-600 font-semibold">{fmt(caja.total_ventas)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Compras:</span><span className="text-red-500 font-semibold">{fmt(caja.total_compras)}</span></div>
            </div>
            <div><label className="lbl">Retiro de billetes (lo que se lleva)</label><input type="number" className="inp text-lg font-bold" value={montoCierre} onChange={e => setMontoCierre(e.target.value)} placeholder="0.00" step="0.01" /></div>
            {montoCierre && (
              <div className="bg-blue-50 rounded-xl p-3 flex flex-col gap-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Retiro de billetes:</span><span className="font-bold text-red-500">- {fmt(montoCierre)}</span></div>
                <div className="flex justify-between border-t border-blue-100 pt-1 mt-1"><span className="text-slate-600 font-semibold">Monedas que quedan en caja:</span><span className="font-bold text-emerald-600">{fmt(Math.max(0, caja.saldo_actual - parseFloat(montoCierre||0)))}</span></div>
              </div>
            )}
            <button onClick={cerrarCaja} disabled={saving} className="btn btn-danger w-full justify-center py-3"><Lock size={16}/> {saving?'Cerrando...':'Confirmar cierre'}</button>
          </div>
        </div></div>
      )}

      {/* Modal ingreso/egreso */}
      {(modal === 'ingreso' || modal === 'egreso') && (
        <div className="modal-overlay"><div className="modal max-w-sm w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-bold">{modal === 'ingreso' ? '↑ Registrar Ingreso' : '↓ Registrar Egreso'}</h2>
            <button onClick={() => setModal(null)}><X size={18} className="text-slate-400"/></button>
          </div>
          <div className="p-6 flex flex-col gap-3">
            <div><label className="lbl">Concepto *</label><input className="inp" value={form.concepto} onChange={e => set('concepto',e.target.value)} placeholder="Descripción del movimiento" autoFocus /></div>
            <div><label className="lbl">Monto (Bs.) *</label><input type="number" className="inp text-lg font-bold" value={form.monto} onChange={e => set('monto',e.target.value)} step="0.01" /></div>
            <div><label className="lbl">Forma de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {['efectivo','qr','tarjeta'].map(f => <button key={f} onClick={() => set('forma_pago',f)} className={`py-2 rounded-lg text-xs font-bold capitalize ${form.forma_pago===f?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}>{f}</button>)}
              </div>
            </div>
            {depositos.length > 0 && <div><label className="lbl">Depósito (opcional)</label>
              <select className="inp" value={form.deposito_id} onChange={e => set('deposito_id',e.target.value)}>
                <option value="">Sin depósito</option>
                {depositos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>}
            <div><label className="lbl">Notas</label><input className="inp" value={form.notas} onChange={e => set('notas',e.target.value)} placeholder="Observaciones..." /></div>
            <button onClick={() => addMovimiento(modal)} disabled={saving} className={`btn w-full justify-center py-3 ${modal==='ingreso'?'btn-success':'btn-danger'}`}>
              <Check size={16}/> {saving ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </div></div>
      )}
    </div>
  )
}
