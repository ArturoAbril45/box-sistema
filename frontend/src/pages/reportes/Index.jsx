import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { BarChart2, TrendingUp, TrendingDown, Package, DollarSign, Users, FileSpreadsheet, FileText } from 'lucide-react'
import dayjs from 'dayjs'

function exportCSV(filename, rows) {
  const csv = rows.map(r => r.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function exportPDF(title, tableId) {
  const table = document.getElementById(tableId)
  if (!table) return
  const win = window.open('', '_blank')
  win.document.write(`<html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
    h2{margin-bottom:16px;color:#1e293b}
    table{width:100%;border-collapse:collapse}
    th{background:#2563eb;color:#fff;padding:8px;text-align:left}
    td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
    tr:nth-child(even){background:#f8fafc}
    .meta{color:#64748b;margin-bottom:12px;font-size:11px}
  </style></head><body>
    <h2>${title}</h2>
    <p class="meta">Generado: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
    ${table.outerHTML}
  </body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 300)
}

export default function Reportes() {
  const { tiendaActual } = useAuth()
  const [tab, setTab]         = useState('resumen')
  const [resumen, setResumen] = useState(null)
  const [ventas, setVentas]   = useState([])
  const [topProd, setTopProd] = useState([])
  const [stock, setStock]     = useState([])
  const [prestamos, setPrestamos] = useState(null)
  const [loading, setLoading] = useState(false)
  const [desde, setDesde]     = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [hasta, setHasta]     = useState(dayjs().format('YYYY-MM-DD'))

  function cargar() {
    if (!tiendaActual) return
    setLoading(true)
    const params = { tienda_id: tiendaActual, desde, hasta }
    Promise.all([
      api.getReporteResumen(params),
      api.getReporteVentasDia(params),
      api.getReporteTopProductos(params),
      api.getReporteStock({ tienda_id: tiendaActual }),
      api.getReportePrestamos(params),
    ]).then(([r,v,t,s,p]) => { setResumen(r); setVentas(v); setTopProd(t); setStock(s); setPrestamos(p) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [tiendaActual, desde, hasta])

  const fmt = n => 'Bs. ' + parseFloat(n||0).toFixed(2)

  function exportarExcel() {
    const periodo = `${desde} al ${hasta}`
    if (tab === 'ventas') {
      exportCSV(`ventas_por_dia_${desde}.csv`, [
        ['Fecha','N° Ventas','Total (Bs.)','Promedio (Bs.)'],
        ...ventas.map(v => [dayjs(v.fecha).format('DD/MM/YYYY'), v.num_ventas, parseFloat(v.total||0).toFixed(2), parseFloat(v.promedio||0).toFixed(2)]),
        ['TOTAL', ventas.reduce((s,v)=>s+parseInt(v.num_ventas),0), ventas.reduce((s,v)=>s+parseFloat(v.total||0),0).toFixed(2), ''],
      ])
    } else if (tab === 'productos') {
      exportCSV(`top_productos_${desde}.csv`, [
        ['#','Producto','Cantidad vendida','Total vendido (Bs.)'],
        ...topProd.map((p,i) => [i+1, p.nombre, parseFloat(p.cantidad_total).toFixed(2), parseFloat(p.total_vendido||0).toFixed(2)]),
      ])
    } else if (tab === 'stock') {
      exportCSV(`stock_${dayjs().format('YYYYMMDD')}.csv`, [
        ['Producto','Categoría','Stock actual','Stock mín.','Estado','Valor inventario (Bs.)'],
        ...stock.map(p => [p.nombre, p.categoria_nombre||'', parseFloat(p.stock||0).toFixed(2), parseFloat(p.stock_minimo||0).toFixed(2),
          parseFloat(p.stock||0)<=0?'Sin stock':parseFloat(p.stock||0)<=parseFloat(p.stock_minimo||0)?'Stock bajo':'OK',
          (parseFloat(p.stock||0)*parseFloat(p.precio_venta||0)).toFixed(2)]),
      ])
    } else if (tab === 'resumen' && resumen) {
      exportCSV(`resumen_${desde}.csv`, [
        ['Concepto','Valor'],
        ['Período', periodo],
        ['Total ventas', parseFloat(resumen.total_ventas||0).toFixed(2)],
        ['N° ventas', resumen.num_ventas],
        ['Total compras', parseFloat(resumen.total_compras||0).toFixed(2)],
        ['N° compras', resumen.num_compras],
        ['Préstamos pendientes', parseFloat(resumen.total_prestamos||0).toFixed(2)],
        ['Flujo neto', parseFloat(resumen.flujo_neto||0).toFixed(2)],
      ])
    }
  }

  function exportarPDF() {
    const tableMap = { ventas:'rpt-ventas', productos:'rpt-productos', stock:'rpt-stock' }
    const titles   = { ventas:'Ventas por día', productos:'Top productos', stock:'Inventario / Stock', resumen:'Resumen' }
    if (tab === 'resumen') {
      const win = window.open('','_blank')
      const r = resumen || {}
      win.document.write(`<html><head><title>Resumen</title><style>body{font-family:Arial;padding:20px;font-size:13px}h2{color:#1e293b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}.card{border:1px solid #e2e8f0;border-radius:8px;padding:16px}.val{font-size:22px;font-weight:700}.lbl{color:#64748b;font-size:12px}</style></head><body>
        <h2>Resumen — ${desde} al ${hasta}</h2>
        <div class="grid">
          <div class="card"><div class="val" style="color:#059669">Bs. ${parseFloat(r.total_ventas||0).toFixed(2)}</div><div class="lbl">Total ventas (${r.num_ventas} trans.)</div></div>
          <div class="card"><div class="val" style="color:#f97316">Bs. ${parseFloat(r.total_compras||0).toFixed(2)}</div><div class="lbl">Total compras (${r.num_compras})</div></div>
          <div class="card"><div class="val" style="color:#3b82f6">Bs. ${parseFloat(r.total_prestamos||0).toFixed(2)}</div><div class="lbl">Préstamos fiado</div></div>
          <div class="card"><div class="val" style="color:${parseFloat(r.flujo_neto||0)>=0?'#059669':'#ef4444'}">Bs. ${parseFloat(r.flujo_neto||0).toFixed(2)}</div><div class="lbl">Flujo neto</div></div>
        </div>
        <p style="color:#94a3b8;font-size:11px">Generado: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
      </body></html>`)
      win.document.close(); win.focus(); setTimeout(()=>{win.print();win.close()},300)
    } else if (tableMap[tab]) {
      exportPDF(titles[tab] + ` (${desde} al ${hasta})`, tableMap[tab])
    }
  }
  const TABS = [
    { id:'resumen', label:'Resumen', icon:BarChart2 },
    { id:'ventas', label:'Ventas por día', icon:TrendingUp },
    { id:'productos', label:'Top productos', icon:Package },
    { id:'stock', label:'Stock', icon:Package },
    { id:'prestamos', label:'Préstamos', icon:Users },
  ]

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" className="inp py-1.5 text-sm" value={desde} onChange={e => setDesde(e.target.value)} />
          <span className="text-slate-400 text-sm">—</span>
          <input type="date" className="inp py-1.5 text-sm" value={hasta} onChange={e => setHasta(e.target.value)} />
          <button onClick={() => exportarExcel()} className="btn btn-ghost border border-slate-200 text-emerald-700 hover:bg-emerald-50 gap-1.5">
            <FileSpreadsheet size={15}/> Excel
          </button>
          <button onClick={() => exportarPDF()} className="btn btn-ghost border border-slate-200 text-red-600 hover:bg-red-50 gap-1.5">
            <FileText size={15}/> PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab===id?'border-blue-600 text-blue-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>

      {loading && <div className="p-16 text-center"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/></div>}

      {!loading && tab === 'resumen' && resumen && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:'Ventas', value:fmt(resumen.total_ventas), sub:`${resumen.num_ventas} transacciones`, icon:TrendingUp, color:'text-emerald-600' },
              { label:'Compras', value:fmt(resumen.total_compras), sub:`${resumen.num_compras} órdenes`, icon:TrendingDown, color:'text-orange-500' },
              { label:'Préstamos fiado', value:fmt(resumen.total_prestamos), sub:`${resumen.num_prestamos} créditos`, icon:Users, color:'text-blue-600' },
              { label:'Flujo neto', value:fmt(resumen.flujo_neto), sub:'ventas - compras', icon:DollarSign, color: parseFloat(resumen.flujo_neto||0)>=0?'text-emerald-700':'text-red-600' },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="card p-5">
                <Icon size={20} className={`mb-3 ${color}`}/>
                <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label} · {sub}</p>
              </div>
            ))}
          </div>
          {resumen.stock_bajo_count > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <Package size={20} className="text-amber-600 flex-shrink-0"/>
              <div>
                <p className="font-semibold text-amber-800">{resumen.stock_bajo_count} productos con stock bajo</p>
                <p className="text-sm text-amber-600">Revisa el módulo de Stock para detalles</p>
              </div>
              <button onClick={() => setTab('stock')} className="ml-auto btn btn-sm bg-amber-600 text-white hover:bg-amber-700">Ver stock</button>
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'ventas' && (
        <div className="card">
          {ventas.length === 0 ? <div className="p-12 text-center text-slate-400">Sin datos para el período</div>
          : <table id="rpt-ventas">
              <thead><tr><th>Fecha</th><th>N° ventas</th><th>Total</th><th>Promedio</th></tr></thead>
              <tbody>{ventas.map(v => (
                <tr key={v.fecha}>
                  <td className="font-medium">{dayjs(v.fecha).format('DD MMM YYYY')}</td>
                  <td className="text-center font-mono">{v.num_ventas}</td>
                  <td className="font-bold text-emerald-600">{fmt(v.total)}</td>
                  <td className="text-slate-500">{fmt(v.promedio)}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="bg-slate-50">
                <td className="font-bold px-4 py-2">Total</td>
                <td className="text-center font-mono font-bold px-4 py-2">{ventas.reduce((s,v)=>s+parseInt(v.num_ventas),0)}</td>
                <td className="font-bold text-emerald-700 px-4 py-2">{fmt(ventas.reduce((s,v)=>s+parseFloat(v.total||0),0))}</td>
                <td/>
              </tr></tfoot>
            </table>}
        </div>
      )}

      {!loading && tab === 'productos' && (
        <div className="card">
          {topProd.length === 0 ? <div className="p-12 text-center text-slate-400">Sin datos</div>
          : <table id="rpt-productos">
              <thead><tr><th>#</th><th>Producto</th><th>Cantidad vendida</th><th>Total vendido</th></tr></thead>
              <tbody>{topProd.map((p,i) => (
                <tr key={p.producto_id}>
                  <td className="font-bold text-slate-400 w-8">{i+1}</td>
                  <td className="font-medium">{p.nombre}</td>
                  <td className="font-mono font-bold text-center">{parseFloat(p.cantidad_total).toFixed(2)}</td>
                  <td className="font-bold text-emerald-600">{fmt(p.total_vendido)}</td>
                </tr>
              ))}</tbody>
            </table>}
        </div>
      )}

      {!loading && tab === 'stock' && (
        <div className="card">
          {stock.length === 0 ? <div className="p-12 text-center text-slate-400">Sin productos</div>
          : <table id="rpt-stock">
              <thead><tr><th>Producto</th><th>Categoría</th><th>Stock actual</th><th>Stock mín.</th><th>Estado</th><th>Valor en inventario</th></tr></thead>
              <tbody>{stock.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.nombre}</td>
                  <td className="text-slate-400 text-xs">{p.categoria_nombre||'—'}</td>
                  <td className={`font-bold font-mono text-center ${parseFloat(p.stock||0) <= parseFloat(p.stock_minimo||0) ? 'text-red-600' : 'text-slate-700'}`}>{parseFloat(p.stock||0).toFixed(2)}</td>
                  <td className="text-center text-slate-400">{parseFloat(p.stock_minimo||0).toFixed(2)}</td>
                  <td><span className={`badge ${parseFloat(p.stock||0) <= 0 ? 'badge-red' : parseFloat(p.stock||0) <= parseFloat(p.stock_minimo||0) ? 'badge-yellow' : 'badge-green'}`}>{parseFloat(p.stock||0) <= 0 ? 'Sin stock' : parseFloat(p.stock||0) <= parseFloat(p.stock_minimo||0) ? 'Stock bajo' : 'OK'}</span></td>
                  <td className="font-mono">{fmt(parseFloat(p.stock||0)*parseFloat(p.precio_venta||0))}</td>
                </tr>
              ))}</tbody>
            </table>}
        </div>
      )}

      {!loading && tab === 'prestamos' && prestamos && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label:'Fiado pendiente', value:fmt(prestamos.total_fiado_pendiente), desc:`${prestamos.num_fiado_pendiente} clientes`, color:'text-red-600' },
            { label:'Fiado cobrado', value:fmt(prestamos.total_fiado_cobrado), desc:'período actual', color:'text-emerald-600' },
            { label:'Préstamos dinero', value:fmt(prestamos.total_dinero_pendiente), desc:`${prestamos.num_dinero_pendiente} préstamos`, color:'text-orange-500' },
          ].map(({ label, value, desc, color }) => (
            <div key={label} className="card p-6">
              <div className={`text-3xl font-bold mb-1 ${color.split(' ')[0]}`}>{value}</div>
              <div className="font-semibold text-slate-700">{label}</div>
              <div className="text-sm text-slate-400 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
