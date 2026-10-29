import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ShoppingCart, X, ArrowLeft, Clock, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const METODOS = [
  { id: 'efectivo',   label: 'Efectivo' },
  { id: 'pago_banco', label: 'Pago Banco' },
  { id: 'fiado',      label: 'Fiado' },
]

function imprimirNota(nota, tipo, logoTienda) {
  const logoUrl = logoTienda ? (window.location.origin + logoTienda) : (window.location.origin + '/boxer-logo.png')
  const fecha = new Date(nota.fechaCobro || nota.fechaEnvio).toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit', year:'numeric' })
  const hora  = new Date(nota.fechaCobro || nota.fechaEnvio).toLocaleTimeString('es-BO', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
  const esTermica = tipo === 'termica'

  const cssTermica = `
    body{font-family:monospace;font-size:12px;width:280px;margin:0 auto;padding:8px}
    h1{font-size:17px;font-weight:bold;text-align:center;margin:0 0 2px;letter-spacing:1px}
    .tienda{text-align:center;font-size:13px;font-weight:bold;margin-bottom:4px}
    .fila{text-align:center;font-size:11px;margin-bottom:4px}
    hr{border:none;border-top:1px dashed #000;margin:5px 0}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{text-align:left;border-bottom:1px solid #000;padding:3px 2px}
    td{padding:3px 2px;vertical-align:top}
    .r{text-align:right}
    .totline{display:flex;justify-content:space-between;font-size:12px;padding:1px 0}
    .grande{font-size:14px;font-weight:bold;border-top:1px solid #000;padding-top:4px;margin-top:2px}
    .pie{text-align:center;font-size:10px;margin-top:8px}
  `
  const cssNormal = `
    body{font-family:Arial,sans-serif;font-size:13px;max-width:720px;margin:20px auto;padding:24px;color:#111}
    .cab{display:flex;align-items:center;gap:20px;border-bottom:3px solid #111;padding-bottom:12px;margin-bottom:14px}
    .cab img{width:70px;height:70px;object-fit:contain}
    .cabtit h1{font-size:28px;font-weight:900;margin:0;letter-spacing:2px}
    .cabtit .tienda{font-size:16px;font-weight:bold;color:#444;margin-top:2px}
    .fila{font-size:12px;color:#555;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;border-bottom:2px solid #111;padding:7px 6px;font-size:12px;text-transform:uppercase}
    td{padding:6px;border-bottom:1px solid #eee;vertical-align:top}
    .r{text-align:right}
    .totales{margin-top:14px;border-top:2px solid #111;padding-top:10px}
    .totline{display:flex;justify-content:space-between;font-size:13px;padding:3px 0}
    .grande{font-size:18px;font-weight:900}
    .pie{text-align:center;font-size:11px;color:#999;margin-top:24px}
  `
  const filas = nota.items.map(i => `
    <tr>
      <td class="r" style="width:40px">${i.cantidad}</td>
      <td>${i.nombre_producto}${i.almacen_nombre ? `<br/><small style="color:#888">${i.almacen_nombre}</small>` : ''}</td>
      <td class="r">Bs. ${parseFloat(i.precio_unitario).toFixed(2)}</td>
      <td class="r">Bs. ${parseFloat(i.subtotal).toFixed(2)}</td>
    </tr>`).join('')

  const mp = nota.montosPago || {}
  const mPago = Object.entries(mp).filter(([,v])=>parseFloat(v)>0)
    .map(([k,v]) => `<div class="totline"><span>${METODOS.find(m=>m.id===k)?.label||k}</span><span>Bs. ${parseFloat(v).toFixed(2)}</span></div>`).join('')

  const totales = `
    ${parseFloat(nota.montoDesc||0)>0?`<div class="totline"><span>Subtotal</span><span>Bs. ${parseFloat(nota.subtotal||0).toFixed(2)}</span></div><div class="totline"><span>Descuento</span><span>-Bs. ${parseFloat(nota.montoDesc||0).toFixed(2)}</span></div>`:''}
    <div class="totline grande"><span>TOTAL</span><span>Bs. ${parseFloat(nota.total||0).toFixed(2)}</span></div>
    ${mPago}
    ${parseFloat(nota.totalPagado||0)>0?`<div class="totline"><span>Total pagado</span><span>Bs. ${parseFloat(nota.totalPagado||0).toFixed(2)}</span></div>`:''}
    ${parseFloat(nota.vuelto||0)>0?`<div class="totline" style="color:green"><span>Cambio</span><span>Bs. ${parseFloat(nota.vuelto||0).toFixed(2)}</span></div>`:''}
    ${parseFloat(nota.fiado||0)>0?`<div class="totline" style="color:#b45309"><span>Fiado</span><span>Bs. ${parseFloat(nota.fiado||0).toFixed(2)}</span></div>`:''}
  `
  const clienteHtml = nota.clienteNombre ? `<div class="fila">Cliente: <strong>${nota.clienteNombre}</strong></div>` : ''
  const htmlTermica = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Nota de Venta</title>
    <style>${cssTermica}@media print{button{display:none}}</style></head>
    <body><h1>NOTA DE VENTA</h1><div class="tienda">${nota.tiendaNombre}</div>
    <div class="fila">Fecha: ${fecha} &nbsp; Hora: ${hora}</div>${clienteHtml}<hr/>
    <table><thead><tr><th class="r">Cant</th><th>Producto</th><th class="r">P.Unit</th><th class="r">Total</th></tr></thead>
    <tbody>${filas}</tbody></table><hr/><div>${totales}</div>
    ${nota.notas?`<hr/><div class="pie">Notas: ${nota.notas}</div>`:''}
    <div class="pie">Gracias por su compra</div></body></html>`
  const htmlNormal = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Nota de Venta</title>
    <style>${cssNormal}@media print{button{display:none}}</style></head>
    <body><div class="cab"><img src="${logoUrl}" onerror="this.style.display='none'"/>
    <div class="cabtit"><h1>NOTA DE VENTA</h1><div class="tienda">${nota.tiendaNombre}</div></div></div>
    <div class="fila">Fecha: ${fecha} &nbsp;&nbsp; Hora: ${hora}</div>${clienteHtml}
    <table><thead><tr><th class="r" style="width:50px">Cant</th><th>Producto</th><th class="r">P. Unit.</th><th class="r">Total</th></tr></thead>
    <tbody>${filas}</tbody></table><div class="totales">${totales}</div>
    ${nota.notas?`<hr/><div class="pie">Notas: ${nota.notas}</div>`:''}
    <div class="pie">Gracias por su compra</div></body></html>`
  const w = esTermica ? 320 : 794
  const win = window.open('', '_blank', `width=${w},height=650`)
  win.document.write(esTermica ? htmlTermica : htmlNormal)
  win.document.close()
  win.onload = () => win.print()
}

function horaCorta(iso) {
  try { return new Date(iso).toLocaleTimeString('es-BO', { hour:'2-digit', minute:'2-digit' }) } catch { return '' }
}

export default function Cajero() {
  const navigate = useNavigate()
  const { tiendaLogo } = useAuth()
  const [cola, setCola]             = useState([])
  const [cobradas, setCobradas]     = useState([])
  const [cobrandoId, setCobrandoId] = useState(null)
  const [errores, setErrores]       = useState({})
  const [abiertas, setAbiertas]     = useState({})
  // montos por tarjeta: { [snapId]: { efectivo:'', pago_banco:'', fiado:'' } }
  const [montosCard, setMontosCard] = useState({})

  useEffect(() => {
    try { setCola(JSON.parse(localStorage.getItem('box_cajero_cola') || '[]')) } catch {}
    try { setCobradas(JSON.parse(localStorage.getItem('box_cajero_cobradas') || '[]')) } catch {}
  }, [])

  function persistirCola(v) { setCola(v); localStorage.setItem('box_cajero_cola', JSON.stringify(v)) }
  function persistirCobradas(v) { setCobradas(v); localStorage.setItem('box_cajero_cobradas', JSON.stringify(v)) }

  function getMontos(id) {
    if (montosCard[id]) return montosCard[id]
    const snap = cola.find(s => s.id === id)
    if (snap?.montosPago) return { efectivo: snap.montosPago.efectivo||'', pago_banco: snap.montosPago.pago_banco||'', fiado: snap.montosPago.fiado||'' }
    return { efectivo:'', pago_banco:'', fiado:'' }
  }
  function setMontos(id, patch) {
    setMontosCard(prev => ({ ...prev, [id]: { ...getMontos(id), ...patch } }))
  }

  function calcular(snap) {
    const m = getMontos(snap.id)
    const totalACobrar = parseFloat(snap.totalACobrar || snap.total || 0)
    const pagadoSinFiado = (parseFloat(m.efectivo)||0) + (parseFloat(m.pago_banco)||0)
    const fiado = snap.cliente_id ? Math.max(0, totalACobrar - pagadoSinFiado) : 0
    const totalPagado = pagadoSinFiado + fiado
    const vuelto = Math.max(0, pagadoSinFiado - totalACobrar)
    const falta = !snap.cliente_id ? Math.max(0, totalACobrar - pagadoSinFiado) : 0
    return { totalACobrar, pagadoSinFiado, fiado, totalPagado, vuelto, falta }
  }

  // Auto-actualizar fiado en estado cuando cambian efectivo/banco
  function handleMonto(snap, field, value) {
    const newM = { ...getMontos(snap.id), [field]: value }
    const totalACobrar = parseFloat(snap.totalACobrar || snap.total || 0)
    const pagadoSinFiado = (parseFloat(newM.efectivo)||0) + (parseFloat(newM.pago_banco)||0)
    const fiado = snap.cliente_id ? Math.max(0, totalACobrar - pagadoSinFiado).toFixed(2) : ''
    setMontos(snap.id, { [field]: value, fiado })
  }

  async function cobrar(snap) {
    const { fiado, totalPagado, vuelto, falta, totalACobrar } = calcular(snap)
    if (falta > 0.009) {
      setErrores(prev => ({ ...prev, [snap.id]: `Falta Bs. ${falta.toFixed(2)} para cubrir el total` }))
      return
    }
    const m = getMontos(snap.id)
    const montosPago = {
      efectivo: m.efectivo || '0',
      pago_banco: m.pago_banco || '0',
      fiado: snap.cliente_id ? fiado.toFixed(2) : '0',
    }
    const metodosUsados = METODOS.filter(mt => parseFloat(montosPago[mt.id]) > 0)
    const forma_pago = metodosUsados.length === 0 ? 'efectivo' : metodosUsados.length === 1 ? metodosUsados[0].id : 'mixto'
    const fiadoMonto = snap.cliente_id ? (parseFloat(fiado) || 0) : 0
    const pagado = Math.max(0, parseFloat(snap.total||0) - fiadoMonto)

    setCobrandoId(snap.id)
    setErrores(prev => ({ ...prev, [snap.id]: '' }))
    try {
      const res = await api.addVenta({
        tienda_id: snap.tienda_id,
        cliente_id: snap.cliente_id || null,
        subtotal: snap.subtotal,
        descuento: snap.montoDesc,
        total: snap.total,
        pagado,
        fiado: fiadoMonto,
        forma_pago,
        montos_pago: JSON.stringify(montosPago),
        notas: snap.notas,
        items: snap.items,
      })
      if (snap.deudaEnCobro && snap.cliente_id) {
        const pagoDeuda = snap.deudaEnCobro.montoPagar ?? snap.deudaEnCobro.total
        if (pagoDeuda > 0) {
          let restante = pagoDeuda
          for (const p of snap.deudaEnCobro.prestamos) {
            if (restante <= 0) break
            const abonar = Math.min(restante, parseFloat(p.saldo||0))
            if (abonar > 0) { await api.pagarPrestamo(p.id, { monto: abonar, forma_pago }); restante -= abonar }
          }
        }
      }
      const cobrada = {
        ...snap,
        montosPago,
        totalPagado,
        vuelto,
        fiado,
        fechaCobro: new Date().toISOString(),
        ventaId: res?.id || null,
      }
      persistirCobradas([cobrada, ...cobradas])
      persistirCola(cola.filter(s => s.id !== snap.id))
    } catch(e) {
      setErrores(prev => ({ ...prev, [snap.id]: e.message || 'Error al cobrar' }))
    } finally {
      setCobrandoId(null)
    }
  }

  function toggle(key) { setAbiertas(prev => ({ ...prev, [key]: !prev[key] })) }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/ventas')} className="btn btn-ghost btn-sm"><ArrowLeft size={14}/> Ventas</button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cajero</h1>
          <p className="text-xs text-slate-400">{cola.length} pendiente{cola.length !== 1 ? 's' : ''} · {cobradas.length} cobrado{cobradas.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/admin/ventas/nueva')} className="ml-auto btn btn-primary btn-sm">
          <ShoppingCart size={13}/> Nueva Venta
        </button>
      </div>

      {/* ── Cola de pendientes ── */}
      <section className="mb-6">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pendientes de cobro</h2>
        {cola.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">
            <Clock size={36} className="mx-auto mb-3 opacity-30"/>
            <p className="text-sm font-medium">No hay ventas pendientes</p>
            <p className="text-xs mt-1">Las notas enviadas desde caja aparecen aquí</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {cola.map(snap => {
              const { totalACobrar, fiado, vuelto, falta } = calcular(snap)
              const m = getMontos(snap.id)
              const expanded = abiertas[snap.id] !== false // abierto por defecto
              return (
                <div key={snap.id} className="card overflow-hidden border-l-4 border-l-amber-400">
                  {/* Cabecera */}
                  <div className="px-5 py-3 flex items-center gap-3 bg-amber-50 border-b border-amber-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm">
                        {snap.clienteNombre || <span className="text-slate-400 font-normal">Sin cliente</span>}
                        <span className="ml-2 text-xs font-normal text-slate-400">{snap.tiendaNombre} · {horaCorta(snap.fechaEnvio)}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {snap.items.length} prod. · <strong>Bs. {parseFloat(snap.total).toFixed(2)}</strong>
                        {parseFloat(snap.deudaCobrar||0) > 0 && <span className="text-amber-600 ml-2">+deuda Bs. {parseFloat(snap.deudaCobrar).toFixed(2)}</span>}
                      </p>
                    </div>
                    <button onClick={() => toggle(snap.id)} className="btn btn-ghost btn-sm px-2">
                      {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                  </div>

                  {expanded && (
                    <>
                      {/* Productos */}
                      <table className="text-xs border-b border-slate-100">
                        <thead>
                          <tr>
                            <th className="w-8 text-center text-slate-400">#</th>
                            <th>Producto</th>
                            <th className="text-center">Cant.</th>
                            <th className="text-right">P.Unit</th>
                            <th className="text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snap.items.map((item, i) => (
                            <tr key={i}>
                              <td className="text-center text-slate-400 font-mono">{i+1}</td>
                              <td>
                                <p className="font-medium">{item.nombre_producto}</p>
                                {item.almacen_nombre && <p className="text-slate-400">{item.almacen_nombre}</p>}
                              </td>
                              <td className="text-center font-bold">{item.cantidad}</td>
                              <td className="text-right">Bs. {parseFloat(item.precio_unitario).toFixed(2)}</td>
                              <td className="text-right font-bold">Bs. {parseFloat(item.subtotal).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totales */}
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                        {parseFloat(snap.montoDesc||0) > 0 && (
                          <>
                            <span className="text-slate-500">Subtotal: Bs. {parseFloat(snap.subtotal||0).toFixed(2)}</span>
                            <span className="text-emerald-600">Descuento: -Bs. {parseFloat(snap.montoDesc||0).toFixed(2)}</span>
                          </>
                        )}
                        <span className="font-bold text-slate-800">TOTAL: Bs. {parseFloat(snap.total||0).toFixed(2)}</span>
                        {parseFloat(snap.deudaCobrar||0) > 0 && (
                          <>
                            <span className="text-amber-600">+ Deuda: Bs. {parseFloat(snap.deudaCobrar||0).toFixed(2)}</span>
                            <span className="font-black text-red-700">TOTAL A COBRAR: Bs. {totalACobrar.toFixed(2)}</span>
                          </>
                        )}
                        {snap.notas && <span className="text-slate-400 w-full">Nota: {snap.notas}</span>}
                      </div>

                      {/* Formas de pago */}
                      <div className="px-5 py-4 flex flex-col gap-3">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Formas de pago</p>
                        <div className="flex flex-col gap-2">
                          {/* Efectivo */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold w-24 shrink-0 text-slate-600">Efectivo</span>
                            <span className="text-slate-400 text-xs shrink-0">Bs.</span>
                            <input type="number" min="0" step="0.01" placeholder="0.00"
                              className="inp flex-1 py-1.5 text-sm"
                              value={m.efectivo}
                              onChange={e => handleMonto(snap, 'efectivo', e.target.value)}
                            />
                          </div>
                          {/* Pago Banco */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold w-24 shrink-0 text-slate-600">Pago Banco</span>
                            <span className="text-slate-400 text-xs shrink-0">Bs.</span>
                            <input type="number" min="0" step="0.01" placeholder="0.00"
                              className="inp flex-1 py-1.5 text-sm"
                              value={m.pago_banco}
                              onChange={e => handleMonto(snap, 'pago_banco', e.target.value)}
                            />
                          </div>
                          {/* Fiado */}
                          <div className={`flex items-center gap-2 ${!snap.cliente_id ? 'opacity-40' : ''}`}>
                            <span className="text-xs font-bold w-24 shrink-0 text-slate-600">
                              Fiado
                              {!snap.cliente_id && <span className="block text-[9px] font-normal text-red-400">Requiere cliente</span>}
                            </span>
                            <span className="text-slate-400 text-xs shrink-0">Bs.</span>
                            <input type="number" readOnly
                              className="inp flex-1 py-1.5 text-sm bg-slate-50"
                              value={snap.cliente_id ? (fiado > 0 ? fiado.toFixed(2) : '') : ''}
                              placeholder="0.00"
                              style={{ cursor: 'default' }}
                            />
                          </div>
                        </div>

                        {/* Resumen cobro */}
                        <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1 text-sm mt-1">
                          <div className="flex justify-between font-bold text-base text-slate-800">
                            <span>TOTAL</span><span>Bs. {totalACobrar.toFixed(2)}</span>
                          </div>
                          {vuelto > 0 && (
                            <div className="flex justify-between font-bold text-emerald-600 text-lg">
                              <span>Cambio</span><span>Bs. {vuelto.toFixed(2)}</span>
                            </div>
                          )}
                          {falta > 0.009 && (
                            <div className="flex justify-between font-bold text-red-500">
                              <span>Falta</span><span>Bs. {falta.toFixed(2)}</span>
                            </div>
                          )}
                          {fiado > 0 && snap.cliente_id && (
                            <div className="flex justify-between font-semibold text-amber-600">
                              <span>Fiado ({snap.clienteNombre})</span><span>Bs. {fiado.toFixed(2)}</span>
                            </div>
                          )}
                          {!snap.cliente_id && falta > 0.009 && (
                            <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mt-1">
                              ⚠ Para registrar fiado debe asignarse un cliente desde caja
                            </p>
                          )}
                        </div>

                        {errores[snap.id] && (
                          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                            <AlertCircle size={13}/> {errores[snap.id]}
                          </div>
                        )}

                        <button
                          onClick={() => cobrar(snap)}
                          disabled={cobrandoId === snap.id || falta > 0.009}
                          className="btn btn-success w-full justify-center py-3 text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                          <Check size={18}/> {cobrandoId === snap.id ? 'Procesando...' : 'Cobrar'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Cobros registrados ── */}
      {cobradas.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cobros registrados</h2>
            <button onClick={() => { if (window.confirm('¿Limpiar el historial? Las ventas en DB no se eliminan.')) persistirCobradas([]) }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors">
              Limpiar
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {cobradas.map(nota => (
              <div key={nota.id} className="card overflow-hidden border-l-4 border-l-emerald-400">
                <div className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <Check size={16} className="text-emerald-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">
                      {nota.clienteNombre || <span className="text-slate-400 font-normal">Sin cliente</span>}
                      <span className="ml-2 text-xs font-normal text-emerald-600 font-semibold">{horaCorta(nota.fechaCobro)}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {nota.items.length} prod. · <strong>Bs. {parseFloat(nota.total).toFixed(2)}</strong>
                      {parseFloat(nota.vuelto||0) > 0 && <span className="text-emerald-600 ml-2">Cambio: Bs. {parseFloat(nota.vuelto).toFixed(2)}</span>}
                      {parseFloat(nota.fiado||0) > 0 && <span className="text-amber-600 ml-2">Fiado: Bs. {parseFloat(nota.fiado).toFixed(2)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => imprimirNota(nota, 'termica', tiendaLogo)} className="btn btn-ghost btn-sm px-2" title="Térmica">🧾</button>
                    <button onClick={() => imprimirNota(nota, 'normal', tiendaLogo)} className="btn btn-ghost btn-sm px-2" title="A4">🖨</button>
                    <button onClick={() => toggle('c_'+nota.id)} className="btn btn-ghost btn-sm px-2">
                      {abiertas['c_'+nota.id] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                  </div>
                </div>
                {abiertas['c_'+nota.id] && (
                  <>
                    <table className="text-xs border-t border-slate-100">
                      <thead>
                        <tr>
                          <th className="w-8 text-center text-slate-400">#</th>
                          <th>Producto</th>
                          <th className="text-center">Cant.</th>
                          <th className="text-right">P.Unit</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nota.items.map((item, i) => (
                          <tr key={i}>
                            <td className="text-center text-slate-400 font-mono">{i+1}</td>
                            <td>
                              <p className="font-medium">{item.nombre_producto}</p>
                              {item.almacen_nombre && <p className="text-slate-400">{item.almacen_nombre}</p>}
                            </td>
                            <td className="text-center font-bold">{item.cantidad}</td>
                            <td className="text-right">Bs. {parseFloat(item.precio_unitario).toFixed(2)}</td>
                            <td className="text-right font-bold">Bs. {parseFloat(item.subtotal).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                      {parseFloat(nota.montoDesc||0) > 0 && <span className="text-emerald-600">Desc: -Bs. {parseFloat(nota.montoDesc||0).toFixed(2)}</span>}
                      <span className="font-bold text-slate-800">TOTAL: Bs. {parseFloat(nota.total||0).toFixed(2)}</span>
                      {Object.entries(nota.montosPago||{}).filter(([,v])=>parseFloat(v)>0).map(([k,v])=>(
                        <span key={k} className="text-blue-600">{METODOS.find(m=>m.id===k)?.label||k}: Bs. {parseFloat(v).toFixed(2)}</span>
                      ))}
                      {parseFloat(nota.vuelto||0) > 0 && <span className="text-emerald-700 font-semibold">Cambio: Bs. {parseFloat(nota.vuelto||0).toFixed(2)}</span>}
                      {parseFloat(nota.fiado||0) > 0 && <span className="text-amber-600 font-semibold">Fiado: Bs. {parseFloat(nota.fiado||0).toFixed(2)}</span>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
