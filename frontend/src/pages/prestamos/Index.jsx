import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Plus, DollarSign, X, Check, Search, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import dayjs from 'dayjs'

const ESTADO_BADGE = { pendiente:'badge-red', parcial:'badge-yellow', pagado:'badge-green', anulado:'badge-gray' }
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS  = ['Do','Lu','Ma','Mi','Ju','Vi','Sá']

function CalendarPicker({ value, onChange }) {
  const [open, setOpen]   = useState(false)
  const [mes, setMes]     = useState(() => value ? dayjs(value) : dayjs())
  const ref = useRef()

  useEffect(() => {
    function click(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  const hoy       = dayjs().startOf('day')
  const inicioMes = mes.startOf('month')
  const diasMes   = mes.daysInMonth()
  const offsetIni = inicioMes.day() // 0=domingo

  const celdas = []
  for (let i = 0; i < offsetIni; i++) celdas.push(null)
  for (let d = 1; d <= diasMes; d++) celdas.push(d)

  function selDia(d) {
    if (!d) return
    const fecha = mes.date(d)
    if (fecha.isBefore(hoy)) return
    onChange(fecha.format('YYYY-MM-DD'))
    setOpen(false)
  }

  const selDay = value ? dayjs(value) : null

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="inp flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors">
        <span className={value ? 'text-slate-800 font-medium' : 'text-slate-400'}>
          {value
            ? (() => { const d = dayjs(value); return `${d.date()} de ${MESES[d.month()]} de ${d.year()}` })()
            : 'Seleccionar fecha…'}
        </span>
        <Calendar size={15} className="text-slate-400 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-72 select-none">
          {/* Cabecera mes */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setMes(m => m.subtract(1,'month'))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <ChevronLeft size={16} className="text-slate-600" />
            </button>
            <span className="text-sm font-bold text-slate-800">
              {MESES[mes.month()]} {mes.year()}
            </span>
            <button type="button" onClick={() => setMes(m => m.add(1,'month'))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Grilla de días */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {celdas.map((d, i) => {
              if (!d) return <div key={i} />
              const fecha  = mes.date(d)
              const pasado = fecha.isBefore(hoy)
              const esSel  = selDay && fecha.format('YYYY-MM-DD') === selDay.format('YYYY-MM-DD')
              const esHoy  = fecha.format('YYYY-MM-DD') === hoy.format('YYYY-MM-DD')
              return (
                <button key={i} type="button" onClick={() => selDia(d)} disabled={pasado}
                  className={`h-8 w-full rounded-full text-xs font-semibold transition-all
                    ${esSel   ? 'bg-blue-600 text-white shadow-md'  : ''}
                    ${!esSel && esHoy  ? 'ring-2 ring-blue-400 text-blue-600' : ''}
                    ${!esSel && !esHoy && !pasado ? 'hover:bg-blue-50 text-slate-700' : ''}
                    ${pasado  ? 'text-slate-300 cursor-not-allowed' : ''}
                  `}>
                  {d}
                </button>
              )
            })}
          </div>

          {value && (
            <button type="button" onClick={() => { onChange(''); setOpen(false) }}
              className="mt-3 w-full text-xs text-slate-400 hover:text-red-500 transition-colors text-center">
              Quitar fecha
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ModalNuevo({ tiendaActual, onClose, onOk }) {
  const [clientes, setClientes]       = useState([])
  const [clienteId, setClienteId]     = useState('')
  const [total, setTotal]             = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [notas, setNotas]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    api.getClientes({ tienda_id: tiendaActual || undefined })
      .then(r => setClientes(Array.isArray(r) ? r : []))
      .catch(() => setClientes([]))
  }, [tiendaActual])

  async function guardar() {
    setError('')
    if (!clienteId)            { setError('Selecciona un cliente'); return }
    if (!total || +total <= 0) { setError('Ingresa un monto mayor a 0'); return }
    setSaving(true)
    try {
      await api.addPrestamo({
        cliente_id:   parseInt(clienteId),
        tienda_id:    tiendaActual,
        total:        parseFloat(total),
        fecha_limite: fechaLimite || null,
        notas:        notas || null,
      })
      onOk()
    } catch (e) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Nuevo Préstamo / Fiado</h2>
          <button type="button" onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">

          {/* Cliente */}
          <div>
            <label className="lbl">Cliente *</label>
            {clientes.length === 0
              ? <p className="text-sm text-slate-400 py-2">Cargando clientes…</p>
              : <select className="inp" value={clienteId} onChange={e => { setClienteId(e.target.value); setError('') }}>
                  <option value="">— Seleccionar cliente —</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}{c.telefono ? ` · ${c.telefono}` : ''}</option>
                  ))}
                </select>
            }
          </div>

          {/* Monto */}
          <div>
            <label className="lbl">Monto total (Bs.) *</label>
            <input type="number" className="inp text-base font-bold" placeholder="0.00"
              step="0.01" min="0.01" value={total} onChange={e => setTotal(e.target.value)} />
          </div>

          {/* Fecha límite */}
          <div>
            <label className="lbl">Fecha límite de pago</label>
            <CalendarPicker value={fechaLimite} onChange={setFechaLimite} />
          </div>

          {/* Notas */}
          <div>
            <label className="lbl">Notas</label>
            <textarea className="inp resize-none" rows={2} placeholder="Opcional…"
              value={notas} onChange={e => setNotas(e.target.value)} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2 font-medium">
              {error}
            </div>
          )}

          <button type="button" onClick={guardar} disabled={saving}
            className="btn btn-primary w-full justify-center py-3 text-sm rounded-xl">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando…</>
              : <><Check size={16}/> Guardar Préstamo</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalPagar({ prestamo, onClose, onOk }) {
  const [monto, setMonto]   = useState(prestamo.saldo)
  const [forma, setForma]   = useState('efectivo')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function pagar() {
    if (!monto || monto <= 0) { setError('Monto inválido'); return }
    setSaving(true)
    try { await api.pagarPrestamo(prestamo.id, { monto: parseFloat(monto), forma_pago: forma }); onOk() }
    catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal max-w-sm w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Cobrar Fiado</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">{prestamo.cliente_nombre}</p>
            <p className="text-xs text-slate-400">{prestamo.numero}</p>
            <p className="text-2xl font-bold text-red-600 mt-2">Saldo: Bs. {parseFloat(prestamo.saldo).toFixed(2)}</p>
          </div>
          <div><label className="lbl">Monto a cobrar</label><input type="number" className="inp text-lg font-bold" value={monto} onChange={e => setMonto(e.target.value)} step="0.01" /></div>
          <div><label className="lbl">Forma de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {['efectivo','qr','tarjeta'].map(f => (
                <button key={f} onClick={() => setForma(f)} className={`py-2 rounded-lg text-xs font-bold capitalize ${forma===f?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}>{f}</button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={pagar} disabled={saving} className="btn btn-success w-full justify-center py-3"><Check size={16}/> {saving?'Cobrando...':'Confirmar cobro'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Prestamos() {
  const { tiendaActual } = useAuth()
  const [prestamos, setPrestamos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [estado, setEstado]       = useState('pendiente')
  const [pagarModal, setPagarModal]   = useState(null)
  const [nuevoModal, setNuevoModal]   = useState(false)

  function cargar() {
    if (!tiendaActual) return
    setLoading(true)
    api.getPrestamos({ tienda_id: tiendaActual, estado }).then(setPrestamos).finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [tiendaActual, estado])

  const totalSaldo = prestamos.reduce((s, p) => s + parseFloat(p.saldo||0), 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Préstamos / Fiado</h1>
          <p className="text-slate-500 text-sm">Saldo total pendiente: <span className="font-bold text-red-600">Bs. {totalSaldo.toFixed(2)}</span></p>
        </div>
        <button onClick={() => setNuevoModal(true)} className="btn btn-primary">
          <Plus size={16}/> Nuevo Préstamo
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['pendiente','parcial','pagado'].map(e => (
          <button key={e} onClick={() => setEstado(e)} className={`btn btn-sm capitalize ${estado===e?'btn-primary':'btn-ghost'}`}>{e}</button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        : prestamos.length === 0 ? <div className="p-12 text-center text-slate-400">No hay préstamos {estado}s</div>
        : <table>
            <thead><tr><th>N°</th><th>Cliente</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
            <tbody>{prestamos.map(p => (
              <tr key={p.id}>
                <td className="font-mono text-xs font-bold text-blue-600">{p.numero}</td>
                <td>
                  <p className="font-medium">{p.cliente_nombre}</p>
                  {p.cliente_telefono && <p className="text-xs text-slate-400">{p.cliente_telefono}</p>}
                </td>
                <td>Bs. {parseFloat(p.total).toFixed(2)}</td>
                <td className="text-emerald-600">Bs. {parseFloat(p.pagado).toFixed(2)}</td>
                <td className="font-bold text-red-600">Bs. {parseFloat(p.saldo).toFixed(2)}</td>
                <td><span className={`badge ${ESTADO_BADGE[p.estado]||'badge-gray'}`}>{p.estado}</span></td>
                <td className="text-slate-400 text-xs">{dayjs(p.created_at).format('DD/MM/YY')}</td>
                <td>
                  {(p.estado === 'pendiente' || p.estado === 'parcial') && (
                    <button onClick={() => setPagarModal(p)} className="btn btn-success btn-sm py-1"><DollarSign size={14}/> Cobrar</button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>}
      </div>

      {pagarModal && <ModalPagar prestamo={pagarModal} onClose={() => setPagarModal(null)} onOk={() => { setPagarModal(null); cargar() }} />}
      {nuevoModal && <ModalNuevo tiendaActual={tiendaActual} onClose={() => setNuevoModal(false)} onOk={() => { setNuevoModal(false); cargar() }} />}
    </div>
  )
}
