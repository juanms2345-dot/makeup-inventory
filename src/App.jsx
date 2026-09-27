import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const IMAGEN_DEFAULT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='100%' height='100%' fill='%23fef3c7'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%23d97706'>YAJA MAKEUP</text></svg>"

export default function Cliente() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas')
  const [paginaActual, setPaginaActual] = useState(1)
  const [enviando, setEnviando] = useState(false)

  const productosPorPagina = 10

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

  const fetchProductosManual = async () => {
    const { data } = await supabase.from('productos').select('*').order('id', { ascending: false })
    setProductos(data || [])
  }

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
          alert('Has alcanzado el límite de unidades disponibles para este producto')
          return prev
        }
        return prev.map((i) => (i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      return [...prev, { ...prod, cantidad: 1 }]
    })
  }

  const totalCarrito = carrito.reduce((t, i) => t + i.precio_venta * i.cantidad, 0)

  // Enviar Pedido por WhatsApp y registrar en BD
  const enviarPedidoWhatsApp = async () => {
    if (carrito.length === 0) return
    setEnviando(true)

    try {
      for (const item of carrito) {
        const nuevoStock = Math.max(item.stock - item.cantidad, 0)
        await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', item.id)
      }

      let clienteId = null
      const { data: clientesWeb } = await supabase
        .from('clientes')
        .select('id')
        .eq('nombre', 'Cliente Web / WhatsApp')
        .limit(1)

      if (clientesWeb && clientesWeb.length > 0) {
        clienteId = clientesWeb[0].id
      } else {
        const { data: nuevoCli } = await supabase
          .from('clientes')
          .insert([{ nombre: 'Cliente Web / WhatsApp', telefono: 'Online' }])
          .select('id')
          .single()
        if (nuevoCli) clienteId = nuevoCli.id
      }

      if (clienteId) {
        await supabase.from('ventas').insert([
          { cliente_id: clienteId, total: totalCarrito, monto_pagado: totalCarrito, estado: 'Pagado' }
        ])
      }

      let mensaje = '✨ *NUEVO PEDIDO EN YAJA MAKEUP* ✨\n\n'
      carrito.forEach((item) => {
        mensaje += `• ${item.nombre} x${item.cantidad} - $${item.precio_venta * item.cantidad}\n`
      })
      mensaje += `\n💰 *Total a Pagar:* $${totalCarrito}\n`
      mensaje += '\n¡Hola! Me gustaría confirmar este pedido.'

      // REEMPLAZA ESTE NÚMERO POR TU WHATSAPP CON CÓDIGO DE COLOMBIA (57)
      const urlWhatsApp = `https://api.whatsapp.com/send?phone=573000000000&text=${encodeURIComponent(mensaje)}`
      
      setCarrito([])
      await fetchProductosManual()
      window.open(urlWhatsApp, '_blank')
    } catch (err) {
      alert('Error al procesar el pedido: ' + err.message)
    } finally {
      setEnviando(false)
    }
  }

  // Extraer lista única de categorías disponibles
  const categoriasUnicas = ['Todas', ...new Set(productos.map((p) => p.categoria).filter(Boolean))]

  // Filtrar productos por búsqueda y categoría
  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda = p.nombre ? p.nombre.toLowerCase().includes(busqueda.toLowerCase()) : false
    const coincideCategoria = categoriaSeleccionada === 'Todas' || p.categoria === categoriaSeleccionada
    return coincideBusqueda && coincideCategoria
  })

  // Lógica de Paginación (Máximo 10 productos por página)
  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina) || 1
  const indiceUltimo = paginaActual * productosPorPagina
  const productosPaginados = productosFiltrados.slice(indiceUltimo - productosPorPagina, indiceUltimo)

  // Resetear a página 1 al cambiar búsqueda o categoría
  const handleCambioCategoria = (cat) => {
    setCategoriaSeleccionada(cat)
    setPaginaActual(1)
  }

  const handleCambioBusqueda = (e) => {
    setBusqueda(e.target.value)
    setPaginaActual(1)
  }

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif', maxWidth: '1100px', margin: '0 auto', background: '#fffcf8', minHeight: '100vh' }}>
      <header style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #fef3c7', paddingBottom: '1rem' }}>
        <h1 style={{ color: '#d97706', margin: '0 0 0.5rem 0' }}>💄 YAJA MAKEUP</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>Encuentra tus productos favoritos de belleza y cuidado personal</p>
      </header>

      {/* Buscador */}
      <div style={{ marginBottom: '1rem' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar labial, sérum, tónico..." 
          value={busqueda} 
          onChange={handleCambioBusqueda}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '1rem' }}
        />
      </div>

      {/* Filtro por Categorías */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.8rem', marginBottom: '1.5rem' }}>
        {categoriasUnicas.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCambioCategoria(cat)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              border: 'none',
              background: categoriaSeleccionada === cat ? '#d97706' : '#fef3c7',
              color: categoriaSeleccionada === cat ? 'white' : '#b45309',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '2rem' }}>
        {/* Catálogo */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>
              Catálogo ({productosFiltrados.length} productos)
            </h3>
            {totalPaginas > 1 && (
              <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 'bold' }}>
                Página {paginaActual} de {totalPaginas}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#d97706' }}>Cargando catálogo...</div>
          ) : productosPaginados.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No se encontraron productos en esta categoría.</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1rem' }}>
                {productosPaginados.map((p) => {
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
                        <p style={{ fontSize: '0.82rem', color: '#4b5563', margin: '0 0 0.5rem 0' }}>💡 {p.descripcion || 'Producto de belleza'}</p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
                          <span style={{ fontWeight: 'bold', color: '#d97706', fontSize: '1.05rem' }}>${p.precio_venta?.toLocaleString()}</span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.2rem 0.4rem', 
                            borderRadius: '12px', 
                            fontWeight: 'bold',
                            background: p.stock <= 0 ? '#fee2e2' : p.stock < 3 ? '#fef3c7' : '#d1fae5',
                            color: p.stock <= 0 ? '#dc2626' : p.stock < 3 ? '#b45309' : '#047857'
                          }}>
                            {p.stock <= 0 ? '❌ Agotado' : p.stock < 3 ? `⚠️ ¡Quedan ${p.stock}! 🎉` : `📦 Quedan: ${p.stock}`}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => agregarAlCarrito(p)} 
                        disabled={p.stock <= 0} 
                        style={{ 
                          width: '100%', 
                          background: p.stock <= 0 ? '#9ca3af' : '#d97706', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.5rem', 
                          borderRadius: '6px', 
                          cursor: p.stock <= 0 ? 'not-allowed' : 'pointer', 
                          fontWeight: 'bold',
                          marginTop: '0.5rem'
                        }}
                      >
                        {p.stock <= 0 ? 'Agotado' : '🛒 Agregar al Pedido'}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Botones de Paginación */}
              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                    disabled={paginaActual === 1}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid #fcd34d',
                      background: paginaActual === 1 ? '#f3f4f6' : '#fff',
                      color: paginaActual === 1 ? '#9ca3af' : '#d97706',
                      cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ◀ Anterior
                  </button>

                  <span style={{ fontWeight: 'bold', color: '#d97706' }}>
                    {paginaActual} / {totalPaginas}
                  </span>

                  <button
                    onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                    disabled={paginaActual === totalPaginas}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid #fcd34d',
                      background: paginaActual === totalPaginas ? '#f3f4f6' : '#fff',
                      color: paginaActual === totalPaginas ? '#9ca3af' : '#d97706',
                      cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Siguiente ▶
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Carrito de Compras */}
        <div style={{ background: '#fff', border: '1px solid #fef3c7', padding: '1.2rem', borderRadius: '12px', height: 'fit-content', position: 'sticky', top: '1rem' }}>
          <h3>🛍️ Mi Pedido</h3>
          {carrito.length === 0 ? <p style={{ color: '#9ca3af' }}>No has seleccionado productos aún.</p> : (
            <>
              {carrito.map((i) => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span>{i.nombre} (x{i.cantidad})</span>
                  <span>${(i.cantidad * i.precio_venta).toLocaleString()}</span>
                </div>
              ))}
              <hr style={{ borderColor: '#fef3c7' }} />
              <h3 style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total:</span>
                <span style={{ color: '#d97706' }}>${totalCarrito.toLocaleString()}</span>
              </h3>
              <button 
                onClick={enviarPedidoWhatsApp} 
                disabled={enviando}
                style={{ width: '100%', background: enviando ? '#6b7280' : '#25D366', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: enviando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {enviando ? 'Procesando pedido...' : '📲 Enviar Pedido por WhatsApp'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
