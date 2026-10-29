import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ShoppingCart, X, Plus, Minus, ChevronRight,
  Package, Truck, ShieldCheck, CreditCard, SlidersHorizontal,
  Store, Phone, Mail, MapPin, Clock, ChevronDown, Filter
} from 'lucide-react'
import { CartProvider, useCart } from '../../context/CartContext'

/* ─── API ─── */
const API = '/backend/tienda-publica'
async function fetchProductos(p = {}) {
  const r = await fetch(`${API}/productos${Object.keys(p).length ? '?' + new URLSearchParams(p) : ''}`)
  return r.ok ? r.json() : []
}
async function fetchCategorias() {
  const r = await fetch(`${API}/categorias`)
  return r.ok ? r.json() : []
}

/* ─── HELPERS ─── */
const fmt = n => `$${parseFloat(n || 0).toFixed(2)}`
function stockLabel(s) {
  if (s <= 0) return { text: 'Sin stock',       cls: 'text-red-500' }
  if (s <= 5) return { text: `Últimas ${s}`,    cls: 'text-amber-500' }
  return              { text: 'En stock',        cls: 'text-emerald-600' }
}

/* ─── TOAST ─── */
function Toast({ msg, show }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 bg-[#1C1005] text-white px-5 py-3 text-sm font-semibold shadow-2xl transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
      <ShoppingCart size={16}/>{msg}
    </div>
  )
}

/* ─── MODAL PRODUCTO ─── */
function ProductModal({ product, onClose, onAdd }) {
  const [qty, setQty]           = useState(1)
  const [selDiv, setSelDiv]     = useState(null)
  const precio = selDiv != null
    ? parseFloat(product.divisiones[selDiv]?.precio_facturado || 0)
    : parseFloat(product.precio_facturado || product.precio_sin_factura || 0)
  const pSin   = parseFloat(product.precio_sin_factura || 0)
  const pMayor = parseFloat(product.precio_mayor || 0)

  return (
    <div className="fixed inset-0 z-[700] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-[#1C1005] px-6 py-4 flex items-center justify-between shrink-0">
          <span className="text-white font-bold text-sm uppercase tracking-wide">Detalle del producto</span>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={22}/></button>
        </div>
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="w-64 shrink-0 bg-slate-50 flex items-center justify-center p-8 border-r border-slate-100">
            {product.foto
              ? <img src={product.foto} alt={product.nombre} className="max-w-full max-h-48 object-contain"/>
              : <div className="flex flex-col items-center gap-3 text-slate-300"><Package size={64} strokeWidth={1}/><span className="text-xs uppercase tracking-widest font-semibold">{product.unidad}</span></div>}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {product.categoria_nombre && <p className="text-[#C8931A] text-xs font-bold uppercase tracking-widest mb-1">{product.categoria_nombre}</p>}
            <h2 className="text-xl font-black text-slate-900 leading-tight mb-1">{product.nombre}</h2>
            {product.codigo && <p className="text-slate-400 text-xs mb-4">REF: {product.codigo}</p>}
            <div className="border border-slate-200 mb-5">
              <div className="flex justify-between items-center px-4 py-3 bg-amber-50 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Precio c/factura</span>
                <span className="text-2xl font-black text-[#C8931A] tabular-nums">{fmt(product.precio_facturado)}</span>
              </div>
              {pSin > 0 && pSin !== parseFloat(product.precio_facturado) && (
                <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase">Sin factura</span>
                  <span className="text-lg font-black text-[#1C1005] tabular-nums">{fmt(pSin)}</span>
                </div>
              )}
              {pMayor > 0 && (
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-xs font-bold text-slate-500 uppercase">Por mayor</span>
                  <span className="text-lg font-black text-[#1C1005] tabular-nums">{fmt(pMayor)}</span>
                </div>
              )}
            </div>
            {product.permite_dividir && product.divisiones?.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Presentaciones</p>
                <div className="grid grid-cols-2 gap-2">
                  {product.divisiones.map((d, i) => (
                    <button key={i} onClick={() => setSelDiv(selDiv === i ? null : i)}
                      className={`border-2 px-3 py-2 text-left transition-all ${selDiv === i ? 'border-[#1C1005] bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="text-xs font-bold text-slate-700">{d.nombre}</div>
                      <div className="text-base font-black text-[#C8931A] tabular-nums">{fmt(d.precio_facturado)}</div>
                      <div className="text-[10px] text-slate-400">x{d.cantidad} {product.unidad}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {product.descripcion && <p className="text-sm text-slate-500 leading-relaxed mb-4">{product.descripcion}</p>}
            <div className={`text-xs font-bold mb-4 ${stockLabel(product.stock).cls}`}>● {stockLabel(product.stock).text} · {product.stock} {product.unidad}</div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-bold text-slate-700 uppercase">Cantidad</span>
              <div className="flex items-center border-2 border-slate-200">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 font-bold"><Minus size={14}/></button>
                <input type="number" value={qty} min={1} max={product.stock}
                  onChange={e => setQty(Math.max(1, Math.min(product.stock, parseInt(e.target.value)||1)))}
                  className="w-12 h-9 text-center font-bold border-x-2 border-slate-200 focus:outline-none tabular-nums text-sm"/>
                <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 font-bold"><Plus size={14}/></button>
              </div>
              <span className="text-sm font-black text-[#1C1005] tabular-nums">{fmt(precio * qty)}</span>
            </div>
            <button onClick={() => { onAdd(product, qty, selDiv != null ? precio : undefined); onClose() }}
              disabled={product.stock <= 0}
              className="w-full bg-[#C8931A] hover:bg-[#8B6010] disabled:bg-slate-300 text-white font-black py-3 flex items-center justify-center gap-2 transition-colors uppercase tracking-wide text-sm">
              <ShoppingCart size={16}/>Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── PRODUCT CARD ─── */
function ProductCard({ product, onOpenModal, onAdd }) {
  const precio = parseFloat(product.precio_facturado || product.precio_sin_factura || 0)
  const pMayor = parseFloat(product.precio_mayor || 0)
  const sl = stockLabel(product.stock)
  return (
    <div className="bg-white flex flex-col group cursor-pointer hover:shadow-lg relative transition-shadow duration-150 border border-slate-100" onClick={() => onOpenModal(product)}>
      <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden relative">
        {product.foto
          ? <img src={product.foto} alt={product.nombre} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-200"/>
          : <div className="flex flex-col items-center gap-2 text-slate-200"><Package size={40} strokeWidth={1}/><span className="text-[10px] font-bold uppercase tracking-widest">{product.unidad}</span></div>}
        {product.categoria_nombre && (
          <span className="absolute top-2 left-2 bg-[#1C1005] text-white text-[9px] font-black px-2 py-0.5 uppercase tracking-wide">{product.categoria_nombre}</span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        {product.codigo && <p className="text-[10px] text-slate-400 font-semibold mb-0.5">REF: {product.codigo}</p>}
        <p className="text-sm font-bold text-slate-800 leading-snug mb-1 flex-1 line-clamp-2">{product.nombre}</p>
        <p className={`text-[10px] font-bold mb-2 ${sl.cls}`}>● {sl.text}</p>
        <div className="mb-1">
          <span className="text-xl font-black text-[#C8931A] tabular-nums">{fmt(precio)}</span>
          <span className="text-[10px] text-slate-400 ml-1 font-semibold">/{product.unidad}</span>
        </div>
        {pMayor > 0 && pMayor < precio && <p className="text-[10px] font-bold text-[#1C1005] mb-2">Mayor: {fmt(pMayor)}</p>}
        <button onClick={e => { e.stopPropagation(); onAdd(product, 1) }} disabled={product.stock <= 0}
          className="w-full bg-[#1C1005] hover:bg-[#0D0804] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black py-2 flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wide mt-auto">
          <ShoppingCart size={12}/>Agregar
        </button>
      </div>
    </div>
  )
}

/* ─── MODAL PEDIDO WHATSAPP ─── */
const WA_NUMBER = '593999999999'

function WhatsAppOrderModal({ items, totalPrice, onClose }) {
  const [nombre, setNombre] = useState('')
  const [nota, setNota]     = useState('')

  function buildMessage() {
    const lineas = items.map(i =>
      `• ${i.nombre} — x${i.qty} ${i.unidad || 'u'} @ ${fmt(i.precio)} = ${fmt(i.precio * i.qty)}`
    ).join('\n')
    const saludo = nombre ? `Hola, soy *${nombre}*.\n\n` : 'Hola, me interesa realizar el siguiente pedido:\n\n'
    const extras = nota ? `\n\n📝 Nota: ${nota}` : ''
    return `${saludo}🛒 *Pedido Comercial Boxer*\n\n${lineas}\n\n*Total: ${fmt(totalPrice)}*${extras}\n\n¿Pueden confirmar disponibilidad? ¡Gracias!`
  }

  function handleWhatsApp() {
    const msg = encodeURIComponent(buildMessage())
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[800] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-[#25D366] px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 text-white font-black text-sm uppercase tracking-wide">
            <IconWhatsApp size={20}/>
            Confirmar pedido por WhatsApp
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={20}/></button>
        </div>

        {/* Resumen productos */}
        <div className="px-5 py-4 border-b border-slate-100 max-h-48 overflow-y-auto">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Resumen del pedido</p>
          {items.map((item, i) => (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{item.nombre}</p>
                <p className="text-[10px] text-slate-400">x{item.qty} {item.unidad || 'u'} · {fmt(item.precio)} c/u</p>
              </div>
              <span className="text-sm font-black text-[#1C1005] tabular-nums ml-4 shrink-0">{fmt(item.precio * item.qty)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center px-5 py-3 bg-amber-50 border-b border-slate-200">
          <span className="text-sm font-black text-slate-700 uppercase">Total del pedido</span>
          <span className="text-xl font-black text-[#1C1005] tabular-nums">{fmt(totalPrice)}</span>
        </div>

        {/* Datos opcionales */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">Tu nombre (opcional)</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Juan Pérez"
              className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-[#25D366] transition-colors"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">Nota adicional (opcional)</label>
            <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: necesito entrega urgente, consulta de precio mayor..."
              rows={2} className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-[#25D366] transition-colors resize-none"/>
          </div>
        </div>

        {/* Botón */}
        <div className="px-5 pb-5">
          <button onClick={handleWhatsApp}
            className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black py-3.5 flex items-center justify-center gap-2.5 transition-colors text-sm uppercase tracking-wide">
            <IconWhatsApp size={18}/>
            Enviar pedido por WhatsApp
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-2">Se abrirá WhatsApp con tu pedido listo para enviar</p>
        </div>
      </div>
    </div>
  )
}

/* ─── CART DRAWER ─── */
function CartDrawer({ open, onClose }) {
  const { items, totalPrice, removeFromCart, setQty, clearCart } = useCart()
  const [waModal, setWaModal] = useState(false)
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-[400]" onClick={onClose}/>}
      <div className={`fixed right-0 top-0 bottom-0 w-96 max-w-full bg-white z-[500] flex flex-col shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="bg-[#1C1005] px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white font-black text-base">
            <ShoppingCart size={18}/>Mi carrito
            {items.length > 0 && <span className="bg-[#C8931A] text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">{items.reduce((s,i)=>s+i.qty,0)}</span>}
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!items.length
            ? <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 px-8">
                <ShoppingCart size={56} strokeWidth={1} className="text-slate-200"/>
                <p className="text-sm font-semibold text-center">Tu carrito está vacío.</p>
              </div>
            : items.map((item, idx) => (
                <div key={idx} className="flex gap-3 px-4 py-3 border-b border-slate-100">
                  <div className="w-14 h-14 bg-slate-50 flex items-center justify-center shrink-0">
                    {item.foto ? <img src={item.foto} alt={item.nombre} className="w-full h-full object-contain p-1"/> : <Package size={24} className="text-slate-300" strokeWidth={1}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-snug truncate">{item.nombre}</p>
                    <p className="text-base font-black text-[#C8931A] tabular-nums mt-0.5">{fmt(item.precio * item.qty)}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button onClick={() => setQty(item.id, item.precio, item.qty-1)} className="w-6 h-6 border border-slate-200 flex items-center justify-center hover:border-slate-400"><Minus size={10}/></button>
                      <span className="text-xs font-black w-5 text-center tabular-nums">{item.qty}</span>
                      <button onClick={() => setQty(item.id, item.precio, item.qty+1)} className="w-6 h-6 border border-slate-200 flex items-center justify-center hover:border-slate-400"><Plus size={10}/></button>
                      <span className="text-[10px] text-slate-400 ml-1">x {fmt(item.precio)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id, item.precio)} className="text-slate-300 hover:text-red-500 self-start mt-0.5"><X size={14}/></button>
                </div>
              ))
          }
        </div>
        {items.length > 0 && (
          <div className="border-t border-slate-200 p-4 shrink-0">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-black text-slate-700 uppercase">Total</span>
              <span className="text-2xl font-black text-[#1C1005] tabular-nums">{fmt(totalPrice)}</span>
            </div>
            <button onClick={() => setWaModal(true)}
              className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black py-3 text-sm uppercase tracking-wide transition-colors mb-2 flex items-center justify-center gap-2">
              <IconWhatsApp size={16}/>Proceder al pago
            </button>
            <button onClick={() => { clearCart(); onClose() }} className="w-full border border-slate-200 hover:border-slate-400 text-slate-500 font-bold py-2.5 text-xs uppercase transition-colors">
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
      {waModal && <WhatsAppOrderModal items={items} totalPrice={totalPrice} onClose={() => setWaModal(false)}/>}
    </>
  )
}

/* ─── SIDEBAR FILTROS ─── */
function FilterSidebar({ cats, activeCat, onCat, priceRange, onPrice, search, onSearch }) {
  const [open, setOpen] = useState(true)
  return (
    <aside className="w-60 shrink-0 flex flex-col gap-3">

      {/* Buscador */}
      <div className="bg-white border border-slate-200 p-4">
        <p className="text-xs font-black text-[#1C1005] uppercase tracking-wider mb-3 flex items-center gap-2"><Search size={13}/>Buscar</p>
        <div className="flex border border-slate-200">
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Nombre, código..."
            className="flex-1 px-3 py-2 text-xs text-slate-700 focus:outline-none placeholder-slate-400 min-w-0"/>
          {search && <button onClick={() => onSearch('')} className="px-2 text-slate-400 hover:text-slate-600"><X size={13}/></button>}
        </div>
      </div>

      {/* Categorías */}
      <div className="bg-white border border-slate-200 p-4">
        <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between mb-3">
          <p className="text-xs font-black text-[#1C1005] uppercase tracking-wider flex items-center gap-2"><Filter size={13}/>Categorías</p>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}/>
        </button>
        {open && (
          <div className="flex flex-col gap-0.5">
            {['Todos', ...cats.map(c => c.nombre)].map(cat => (
              <button key={cat} onClick={() => onCat(cat)}
                className={`text-left px-3 py-2 text-xs font-semibold transition-all flex items-center justify-between ${
                  activeCat === cat
                    ? 'bg-[#1C1005] text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                <span>{cat}</span>
                {activeCat === cat && <ChevronRight size={11}/>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Precio */}
      <div className="bg-white border border-slate-200 p-4">
        <p className="text-xs font-black text-[#1C1005] uppercase tracking-wider mb-3">Rango de precio</p>
        <div className="flex items-center gap-2 mb-3">
          <input type="number" placeholder="Min" value={priceRange[0] || ''} min={0}
            onChange={e => onPrice([parseFloat(e.target.value)||0, priceRange[1]])}
            className="w-full border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:border-[#C8931A] tabular-nums"/>
          <span className="text-slate-400 text-xs shrink-0">—</span>
          <input type="number" placeholder="Max" value={priceRange[1] || ''} min={0}
            onChange={e => onPrice([priceRange[0], parseFloat(e.target.value)||0])}
            className="w-full border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:border-[#C8931A] tabular-nums"/>
        </div>
        <button onClick={() => onPrice([0, 0])} className="text-[10px] text-slate-400 hover:text-[#C8931A] font-semibold transition-colors">
          Limpiar filtro
        </button>
      </div>
    </aside>
  )
}

/* ─── SECCIÓN CATÁLOGO ─── */
function SeccionCatalogo({ products, cats, loading, onModal, onAdd }) {
  const [activeCat, setActiveCat] = useState('Todos')
  const [search, setSearch]       = useState('')
  const [priceRange, setPriceRange] = useState([0, 0])
  const [sort, setSort]           = useState('nombre')
  const [mobileFilter, setMobileFilter] = useState(false)

  const filtered = products
    .filter(p => {
      const catOk = activeCat === 'Todos' || p.categoria_nombre === activeCat
      const q = search.toLowerCase()
      const sOk = !q || [p.nombre, p.codigo, p.descripcion, p.categoria_nombre].some(f => (f||'').toLowerCase().includes(q))
      const minP = priceRange[0], maxP = priceRange[1]
      const price = parseFloat(p.precio_facturado || 0)
      const priceOk = (!minP && !maxP) || (price >= (minP||0) && (!maxP || price <= maxP))
      return catOk && sOk && priceOk
    })
    .sort((a,b) => {
      if (sort === 'precio_asc')  return parseFloat(a.precio_facturado) - parseFloat(b.precio_facturado)
      if (sort === 'precio_desc') return parseFloat(b.precio_facturado) - parseFloat(a.precio_facturado)
      return (a.nombre||'').localeCompare(b.nombre||'')
    })

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 min-h-[70vh]">
      {/* Mobile filter toggle */}
      <button onClick={() => setMobileFilter(v=>!v)} className="lg:hidden flex items-center gap-2 mb-4 bg-[#1C1005] text-white px-4 py-2 text-sm font-bold uppercase">
        <SlidersHorizontal size={15}/>Filtros {mobileFilter ? '▲' : '▼'}
      </button>

      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <div className={`${mobileFilter ? 'block' : 'hidden'} lg:block`}>
          <FilterSidebar cats={cats} activeCat={activeCat} onCat={setActiveCat}
            priceRange={priceRange} onPrice={setPriceRange} search={search} onSearch={setSearch}/>
        </div>

        {/* Grid area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#1C1005] pb-3">
            <h2 className="text-base font-black text-[#1C1005] uppercase tracking-wide">
              {activeCat === 'Todos' ? <>Todos los <span className="text-[#C8931A]">productos</span></> : activeCat}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="border border-slate-300 text-xs font-semibold px-2 py-1.5 bg-white focus:outline-none focus:border-[#1C1005]">
                <option value="nombre">A–Z</option>
                <option value="precio_asc">Precio ↑</option>
                <option value="precio_desc">Precio ↓</option>
              </select>
            </div>
          </div>

          {loading
            ? <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-px bg-slate-200">
                {Array.from({length:8}).map((_,i) => (
                  <div key={i} className="bg-white animate-pulse">
                    <div className="aspect-square bg-slate-100"/>
                    <div className="p-3 space-y-2"><div className="h-3 bg-slate-100 rounded w-3/4"/><div className="h-5 bg-slate-100 rounded w-1/3"/></div>
                  </div>
                ))}
              </div>
            : filtered.length === 0
              ? <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Package size={56} strokeWidth={1} className="mb-3 text-slate-200"/>
                  <p className="font-bold text-slate-600 mb-1">Sin resultados</p>
                  <p className="text-sm">Prueba con otro filtro o categoría.</p>
                </div>
              : <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-px bg-slate-200">
                  {filtered.map(p => <ProductCard key={p.id} product={p} onOpenModal={onModal} onAdd={onAdd}/>)}
                </div>
          }
        </div>
      </div>
    </div>
  )
}

/* ─── SECCIÓN INICIO ─── */
function SeccionInicio({ products, loading, onNav, onModal, onAdd }) {
  const featured = products.slice(0, 8)
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1C1005] to-[#3D2208] text-white">
        <div className="max-w-screen-xl mx-auto px-4 py-16 flex items-center gap-12">
          <div className="flex-1">
            <p className="text-[#C8931A] text-xs font-black uppercase tracking-[3px] mb-3">Insumos Mineros · Eficiencia y Tradición</p>
            <h1 className="text-4xl font-black leading-tight uppercase mb-4">
              Comercial<br/><span className="text-[#C8931A]">Boxer</span>
            </h1>
            <p className="text-white/70 text-sm leading-relaxed mb-8 max-w-md">
              Tu proveedor de confianza en insumos mineros, herramientas y materiales. Calidad garantizada con los mejores precios del mercado.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => onNav('catalogo')} className="bg-[#C8931A] hover:bg-[#8B6010] text-white font-black px-6 py-3 text-sm uppercase tracking-wide transition-colors flex items-center gap-2">
                <Package size={15}/>Ver catálogo
              </button>
              <button onClick={() => onNav('contacto')} className="border border-white/30 hover:border-white text-white font-bold px-6 py-3 text-sm uppercase tracking-wide transition-colors">
                Contactarnos
              </button>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center w-64 shrink-0">
            <img src="/boxer-logo.png" alt="Comercial Boxer" className="w-52 h-52 object-contain drop-shadow-2xl"/>
          </div>
        </div>
      </div>

      {/* Promo bar */}
      <div className="bg-[#C8931A]">
        <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center justify-center gap-8 flex-wrap">
          {[[Truck,'Entrega en sucursales'],[ShieldCheck,'Productos garantizados'],[CreditCard,'Múltiples formas de pago']].map(([Icon,txt]) => (
            <div key={txt} className="flex items-center gap-2 text-white text-xs font-semibold"><Icon size={13}/>{txt}</div>
          ))}
        </div>
      </div>

      {/* Productos destacados */}
      <div className="max-w-screen-xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6 border-b-2 border-[#1C1005] pb-3">
          <h2 className="text-base font-black text-[#1C1005] uppercase tracking-wide">Productos <span className="text-[#C8931A]">destacados</span></h2>
          <button onClick={() => onNav('catalogo')} className="text-xs font-bold text-[#C8931A] hover:underline uppercase tracking-wide flex items-center gap-1">
            Ver todo <ChevronRight size={13}/>
          </button>
        </div>
        {loading
          ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-slate-200">
              {Array.from({length:4}).map((_,i) => <div key={i} className="bg-white animate-pulse"><div className="aspect-square bg-slate-100"/><div className="p-3 space-y-2"><div className="h-3 bg-slate-100 rounded w-3/4"/><div className="h-5 bg-slate-100 rounded w-1/3"/></div></div>)}
            </div>
          : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-slate-200">
              {featured.map(p => <ProductCard key={p.id} product={p} onOpenModal={onModal} onAdd={onAdd}/>)}
            </div>
        }
      </div>
    </div>
  )
}

/* ─── SECCIÓN QUIÉNES SOMOS ─── */
function SeccionNosotros() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <p className="text-[#C8931A] text-xs font-black uppercase tracking-[3px] mb-2">Conócenos</p>
        <h2 className="text-3xl font-black text-[#1C1005] uppercase mb-4">Quiénes Somos</h2>
        <div className="w-16 h-1 bg-[#C8931A] mx-auto"/>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-center mb-16">
        <div className="lg:w-80 shrink-0 flex items-center justify-center">
          <img src="/boxer-logo.png" alt="Comercial Boxer" className="w-64 h-64 object-contain"/>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-black text-[#1C1005] uppercase mb-4">Comercial Boxer</h3>
          <p className="text-slate-600 leading-relaxed mb-4">
            Somos una empresa dedicada a la distribución y venta de insumos mineros, herramientas industriales y materiales de construcción. Con años de experiencia en el mercado, nos hemos consolidado como un aliado estratégico para mineros, contratistas y empresas del sector.
          </p>
          <p className="text-slate-600 leading-relaxed mb-6">
            Nuestra filosofía es simple: <strong className="text-[#1C1005]">calidad, eficiencia y tradición</strong>. Ofrecemos productos de primera línea con precios competitivos y atención personalizada para cada cliente.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Años de experiencia', '10+'],
              ['Productos en catálogo', '500+'],
              ['Clientes satisfechos', '1000+'],
              ['Sucursales', '3'],
            ].map(([label, val]) => (
              <div key={label} className="border-l-4 border-[#C8931A] pl-4">
                <div className="text-2xl font-black text-[#1C1005]">{val}</div>
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Valores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: ShieldCheck, title: 'Calidad Garantizada', desc: 'Todos nuestros productos cumplen con los estándares de calidad exigidos por la industria minera y de construcción.' },
          { icon: Truck, title: 'Entrega en Sucursales', desc: 'Recoge tus pedidos en cualquiera de nuestras sucursales disponibles, con horarios flexibles para tu conveniencia.' },
          { icon: Package, title: 'Variedad de Productos', desc: 'Contamos con un amplio catálogo de insumos, herramientas, EPP y materiales para todos tus proyectos.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white border border-slate-200 p-6">
            <Icon size={28} className="text-[#C8931A] mb-4"/>
            <h4 className="font-black text-[#1C1005] uppercase text-sm mb-2 tracking-wide">{title}</h4>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── SECCIÓN CONTACTO ─── */
function SeccionContacto() {
  const [form, setForm] = useState({ nombre: '', email: '', mensaje: '' })
  const [sent, setSent] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setSent(true)
    setTimeout(() => setSent(false), 4000)
    setForm({ nombre: '', email: '', mensaje: '' })
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <p className="text-[#C8931A] text-xs font-black uppercase tracking-[3px] mb-2">Estamos aquí</p>
        <h2 className="text-3xl font-black text-[#1C1005] uppercase mb-4">Contacto</h2>
        <div className="w-16 h-1 bg-[#C8931A] mx-auto"/>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Info */}
        <div className="lg:w-80 shrink-0">
          <h3 className="text-sm font-black text-[#1C1005] uppercase tracking-wide mb-6 border-b-2 border-[#C8931A] pb-2">Información de contacto</h3>
          <div className="flex flex-col gap-5">
            {[
              [Phone,   'Teléfono',    '+593 99 999 9999'],
              [Mail,    'Correo',      'info@comercialboxer.com'],
              [MapPin,  'Dirección',   'Av. Principal, Ciudad, Ecuador'],
              [Clock,   'Horario',     'Lun–Vie 8:00–18:00 · Sáb 8:00–13:00'],
            ].map(([Icon, label, val]) => (
              <div key={label} className="flex gap-4">
                <Icon size={20} className="text-[#C8931A] shrink-0 mt-0.5"/>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-slate-700">{val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 bg-white border border-slate-200 p-8">
          <h3 className="text-sm font-black text-[#1C1005] uppercase tracking-wide mb-6 border-b-2 border-[#C8931A] pb-2">Envíanos un mensaje</h3>
          {sent
            ? <div className="flex flex-col items-center justify-center py-10 gap-3">
                <ShieldCheck size={40} className="text-[#C8931A]"/>
                <p className="font-black text-[#1C1005] uppercase">¡Mensaje enviado!</p>
                <p className="text-sm text-slate-500">Te responderemos a la brevedad posible.</p>
              </div>
            : <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">Nombre completo</label>
                  <input required value={form.nombre} onChange={e => setForm(f=>({...f,nombre:e.target.value}))} placeholder="Tu nombre"
                    className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8931A] transition-colors"/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">Correo electrónico</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="tu@correo.com"
                    className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8931A] transition-colors"/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">Mensaje</label>
                  <textarea required rows={4} value={form.mensaje} onChange={e => setForm(f=>({...f,mensaje:e.target.value}))} placeholder="¿En qué podemos ayudarte?"
                    className="w-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8931A] transition-colors resize-none"/>
                </div>
                <button type="submit" className="bg-[#C8931A] hover:bg-[#8B6010] text-white font-black py-3 uppercase tracking-wide text-sm transition-colors">
                  Enviar mensaje
                </button>
              </form>
          }
        </div>
      </div>
    </div>
  )
}

/* ─── SOCIAL ICONS ─── */
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)
const IconTikTok = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
  </svg>
)
const IconFacebook = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)
const IconWhatsApp = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
)

/* ─── HEADER PRINCIPAL ─── */
function Header({ activePage, onNav, onCartOpen }) {
  const { totalItems } = useCart()
  const [searchQ, setSearchQ] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    onNav('catalogo')
  }

  const LINKS = [
    { id: 'inicio',   label: 'Inicio' },
    { id: 'catalogo', label: 'Catálogo' },
    { id: 'nosotros', label: 'Quiénes Somos' },
    { id: 'contacto', label: 'Contacto' },
  ]

  return (
    <header className="bg-[#1C1005] sticky top-0 z-[200] shadow-lg">
      {/* Top bar */}
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-4">
        <button onClick={() => onNav('inicio')} className="flex items-center gap-2.5 shrink-0">
          <img src="/boxer-logo.png" alt="Comercial Boxer" className="h-10 w-10 object-contain"/>
          <div className="hidden sm:block">
            <div className="text-white font-black text-base leading-none tracking-wide">COMERCIAL</div>
            <div className="text-[#C8931A] font-black text-base leading-none tracking-wide">BOXER</div>
          </div>
        </button>

        <form onSubmit={handleSearch} className="flex-1 flex max-w-xl mx-auto">
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar productos..."
            className="flex-1 px-4 py-2.5 text-sm bg-white text-slate-800 placeholder-slate-400 focus:outline-none border-none"/>
          <button type="submit" className="bg-[#C8931A] hover:bg-[#8B6010] px-4 flex items-center gap-2 text-white font-bold text-sm transition-colors shrink-0">
            <Search size={15}/>
          </button>
        </form>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onCartOpen} className="relative flex flex-col items-center gap-0.5 text-white/80 hover:text-white px-2 py-1">
            <ShoppingCart size={21}/>
            <span className="text-[9px] font-semibold uppercase hidden sm:block">Carrito</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-0.5 bg-[#C8931A] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{totalItems}</span>
            )}
          </button>
        </div>
      </div>

      {/* Nav links */}
      <div className="bg-[#0D0804] border-t border-white/10">
        <div className="max-w-screen-xl mx-auto px-4 flex items-center justify-between">
          <div className="flex">
            {LINKS.map(l => (
              <button key={l.id} onClick={() => onNav(l.id)}
                className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-[3px] ${
                  activePage === l.id
                    ? 'text-[#C8931A] border-[#C8931A]'
                    : 'text-white/70 border-transparent hover:text-white hover:bg-white/5'
                }`}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {[
              { Icon: IconInstagram, href: 'https://instagram.com', label: 'Instagram' },
              { Icon: IconTikTok,    href: 'https://tiktok.com',    label: 'TikTok' },
              { Icon: IconFacebook,  href: 'https://facebook.com',  label: 'Facebook' },
              { Icon: IconWhatsApp,  href: 'https://wa.me/593999999999', label: 'WhatsApp' },
            ].map(({ Icon, href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label}
                className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-[#C8931A] transition-colors">
                <Icon/>
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

/* ─── FOOTER ─── */
function Footer({ onNav }) {
  const cats_footer = []
  return (
    <footer className="bg-[#1C1005] text-white/60 mt-12">
      <div className="max-w-screen-xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src="/boxer-logo.png" alt="Boxer" className="h-20 w-20 object-contain"/>
            <div>
              <div className="text-white font-black text-lg leading-none">COMERCIAL</div>
              <div className="text-[#C8931A] font-black text-lg leading-none">BOXER</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed">Insumos Mineros · Eficiencia y Tradición</p>
        </div>
        <div>
          <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4 pb-2 border-b-2 border-[#C8931A]">Navegación</h4>
          <div className="flex flex-col gap-2">
            {[['inicio','Inicio'],['catalogo','Catálogo'],['nosotros','Quiénes Somos'],['contacto','Contacto']].map(([id,label])=>(
              <button key={id} onClick={()=>onNav(id)} className="text-sm text-left hover:text-white transition-colors flex items-center gap-1.5"><ChevronRight size={11}/>{label}</button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4 pb-2 border-b-2 border-[#C8931A]">Contacto</h4>
          <div className="flex flex-col gap-2 text-sm">
            <span className="flex items-center gap-2"><Phone size={12}/> +593 99 999 9999</span>
            <span className="flex items-center gap-2"><Mail size={12}/> info@comercialboxer.com</span>
            <span className="flex items-center gap-2"><MapPin size={12}/> Ecuador</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/30">
        © {new Date().getFullYear()} Comercial Boxer — Powered by Box Sistema
      </div>
    </footer>
  )
}

/* ─── APP PRINCIPAL ─── */
function TiendaInner() {
  const [page, setPage]           = useState('inicio')
  const [products, setProducts]   = useState([])
  const [cats, setCats]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [cartOpen, setCartOpen]   = useState(false)
  const [modal, setModal]         = useState(null)
  const [toast, setToast]         = useState({ show: false, msg: '' })
  const { addToCart }             = useCart()

  useEffect(() => {
    Promise.all([fetchProductos(), fetchCategorias()])
      .then(([p, c]) => { setProducts(p); setCats(c) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const showToast = useCallback(msg => {
    setToast({ show: true, msg })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2600)
  }, [])

  function handleAdd(product, qty = 1, precio) {
    addToCart(product, qty, precio)
    showToast(`${product.nombre.slice(0, 30)}… agregado`)
  }

  function handleNav(p) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-900">
      <Header activePage={page} onNav={handleNav} onCartOpen={() => setCartOpen(true)}/>

      {page === 'inicio'   && <SeccionInicio  products={products} loading={loading} onNav={handleNav} onModal={setModal} onAdd={handleAdd}/>}
      {page === 'catalogo' && <SeccionCatalogo products={products} cats={cats} loading={loading} onModal={setModal} onAdd={handleAdd}/>}
      {page === 'nosotros' && <SeccionNosotros/>}
      {page === 'contacto' && <SeccionContacto/>}

      <Footer onNav={handleNav}/>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)}/>
      {modal && <ProductModal product={modal} onClose={() => setModal(null)} onAdd={handleAdd}/>}
      <Toast msg={toast.msg} show={toast.show}/>
    </div>
  )
}

export default function Tienda() {
  return (
    <CartProvider>
      <TiendaInner/>
      {/* WhatsApp flotante — siempre visible en todas las secciones */}
      <a href="https://wa.me/593999999999" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[998] group flex items-center gap-3">
        <span className="hidden group-hover:flex bg-white text-slate-800 text-xs font-bold px-3 py-2 shadow-lg whitespace-nowrap items-center">
          ¡Escríbenos!
        </span>
        <div className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] flex items-center justify-center shadow-2xl transition-all hover:scale-110 text-white">
          <IconWhatsApp size={28}/>
        </div>
      </a>
    </CartProvider>
  )
}
