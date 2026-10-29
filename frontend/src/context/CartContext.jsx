import { createContext, useContext, useReducer, useEffect } from 'react'

const CartContext = createContext()

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const { product, qty, precio } = action
      const existing = state.items.find(i => i.id === product.id && i.precio === precio)
      if (existing) {
        return { ...state, items: state.items.map(i =>
          i.id === product.id && i.precio === precio ? { ...i, qty: i.qty + qty } : i
        )}
      }
      return { ...state, items: [...state.items, {
        id: product.id,
        nombre: product.nombre,
        unidad: product.unidad || 'u',
        precio,
        qty,
        foto: product.foto || null,
      }]}
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => !(i.id === action.id && i.precio === action.precio)) }
    case 'SET_QTY': {
      const qty = Math.max(1, action.qty)
      return { ...state, items: state.items.map(i =>
        i.id === action.id && i.precio === action.precio ? { ...i, qty } : i
      )}
    }
    case 'CLEAR':
      return { ...state, items: [] }
    default:
      return state
  }
}

const STORAGE_KEY = 'box_cart'

export function CartProvider({ children }) {
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { items: [] } } catch { return { items: [] } }
  })()

  const [state, dispatch] = useReducer(cartReducer, saved)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const totalItems = state.items.reduce((s, i) => s + i.qty, 0)
  const totalPrice = state.items.reduce((s, i) => s + i.precio * i.qty, 0)

  function addToCart(product, qty = 1, precio) {
    const p = precio ?? parseFloat(product.precio_facturado || product.precio_sin_factura || 0)
    dispatch({ type: 'ADD', product, qty, precio: p })
  }

  function removeFromCart(id, precio) { dispatch({ type: 'REMOVE', id, precio }) }
  function setQty(id, precio, qty)   { dispatch({ type: 'SET_QTY', id, precio, qty }) }
  function clearCart()               { dispatch({ type: 'CLEAR' }) }

  return (
    <CartContext.Provider value={{ items: state.items, totalItems, totalPrice, addToCart, removeFromCart, setQty, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
