import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Imagen por defecto local en SVG (no requiere internet ni servidores externos)
const IMAGEN_DEFAULT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='100%' height='100%' fill='%23fef3c7'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%23d97706'>YAJA MAKEUP</text></svg>"

export default function Cliente() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    let isSubscribed = true
    async function fetchProductos() {
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .order('id', { ascending: false })
        
        if (error) console.error(error)
        if (isSubscribed) {
          setProductos(data || [])
          setLoading(false)
        }
      } catch (err) {
        if (isSubscribed) setLoading(false)
      }
    }
    fetchProductos()
    return () => { isSubscribed = false }
  }, [])

  const esUrlValida = (string) => {
    if (!string) return false
    try {
      const url = new URL(string)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch (_) {
      return false
    }
  }

  const agregarAlCarrito = (prod) => {
    if (prod.stock <= 0) return alert('Producto agotado por el momento')
    setCarrito((prev) => {
      const ex = prev.find((i) => i.id === prod.id)
      if (ex) {
        if (ex.cantidad >= prod.stock) {
          alert('Has alcanzado el límite de unidades disponibles')
          return prev
        }
        return prev.map((i) => (i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      return [...prev, { ...prod, cantidad: 1 }]
    })
  }

  const totalCarrito = carrito.reduce((t, i) => t + i.precio_venta * i.cantidad, 0)

  const enviarPedidoWhatsApp = () => {
    if (carrito.length === 0) return
    let mensaje = '✨ *NUEVO PEDIDO EN YAJA MAKEUP* ✨\n\n'
    carrito.forEach((item) => {
      mensaje += `• ${item.nombre} x${item.cantidad} - $${item.precio_venta * item.cantidad}\n`
    })
    mensaje += `\n💰 *Total a Pagar:* $${totalCarrito}\n`
    mensaje += '\n¡Hola! Me gustaría confirmar este pedido.'

    // Recuerda colocar tu número de WhatsApp aquí con 57 al inicio
    const urlWhatsApp = `https://api.whatsapp.com/send?phone=573209038396&text=${encodeURIComponent(mensaje)}`
    window.open(urlWhatsApp, '_blank')
  }

  const productosFiltrados = productos.filter((p) =>
    p.nombre ? p.nombre.toLowerCase().includes(busqueda.toLowerCase()) : false
  )

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif', maxWidth: '1100px', margin: '0 auto', background: '#fffcf8', minHeight: '100vh' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #fef3c7', paddingBottom: '1rem' }}>
        <h1 style={{ color: '#d97706', margin: '0 0 0.5rem 0' }}>💄 YAJA MAKEUP</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>Encuentra tus productos favoritos de belleza y cuidado personal</p>
      </header>

      <div style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar labial, sérum, tónico..." 
          value={busqueda} 
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '1rem' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '2rem' }}>
        <div>
          <h3>Catálogo Disponible</h3>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#d97706' }}>Cargando catálogo...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {productosFiltrados.map((p) => {
                const foto = esUrlValida(p.imagen_url) ? p.imagen_url : IMAGEN_DEFAULT
                return (
                  <div key={p.id} style={{ border: '1px solid #fef3c7', borderRadius: '12px', padding: '0.8rem', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <img 
                        src={foto} 
                        alt={p.nombre || 'Producto'} 
                        onError={(e) => { 
                          e.target.onerror = null; 
                          e.target.src = IMAGEN_DEFAULT; 
                        }} 
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem' }} 
                      />
                      <h4 style={{ margin: '0 0 0.3rem 0', color: '#1f2937' }}>{p.nombre}</h4>
                      <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: '0 0 0.5rem 0' }}>💡 {p.descripcion || 'Producto de belleza'}</p>
                      <div style={{ fontWeight: 'bold', color: '#d97706', fontSize: '1.1rem', marginBottom: '0.5rem' }}>${p.precio_venta}</div>
                    </div>
                    <button 
                      onClick={() => agregarAlCarrito(p)} 
                      disabled={p.stock <= 0} 
                      style={{ width: '100%', background: p.stock <= 0 ? '#9ca3af' : '#d97706', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: p.stock <= 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                    >
                      {p.stock <= 0 ? 'Agotado' : '🛒 Agregar al Pedido'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #fef3c7', padding: '1.2rem', borderRadius: '12px', height: 'fit-content', position: 'sticky', top: '1rem' }}>
          <h3>🛍️ Mi Pedido</h3>
          {carrito.length === 0 ? <p style={{ color: '#9ca3af' }}>No has seleccionado productos aún.</p> : (
            <>
              {carrito.map((i) => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span>{i.nombre} (x{i.cantidad})</span>
                  <span>${i.cantidad * i.precio_venta}</span>
                </div>
              ))}
              <hr style={{ borderColor: '#fef3c7' }} />
              <h3 style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total:</span>
                <span style={{ color: '#d97706' }}>${totalCarrito}</span>
              </h3>
              <button 
                onClick={enviarPedidoWhatsApp} 
                style={{ width: '100%', background: '#25D366', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                📲 Enviar Pedido por WhatsApp
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
