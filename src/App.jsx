import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const IMAGEN_DEFAULT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%239ca3af'>Sin Imagen</text></svg>"

const CATEGORIAS_SUGERIDAS = ['Labiales', 'Sérums', 'Cuidado Facial', 'Maquillaje']

const ADMIN_USUARIO = "admin"
const ADMIN_CLAVE = "yaja123"

export default function App() {
  const [autenticado, setAutenticado] = useState(false)
  const [inputUsuario, setInputUsuario] = useState('')
  const [inputClave, setInputClave] = useState('')
  const [errorLogin, setErrorLogin] = useState('')

  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)

  const [productoEditando, setProductoEditando] = useState(null)
  const [nombre, setNombre] = useState('')
  const [stock, setStock] = useState('')
  const [precioEntrada, setPrecioEntrada] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [categoria, setCategoria] = useState('Labiales')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [esNuevaCategoria, setEsNuevaCategoria] = useState(false)
  const [imagenUrl, setImagenUrl] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')

  const [clienteSeleccionado, setClienteSeleccionado] = useState('')
  const [montoAbonoInicial, setMontoAbonoInicial] = useState('')

  const [carrito, setCarrito] = useState([])
  const [procesandoCompra, setProcesandoCompra] = useState(false)

  const [paginaActual, setPaginaActual] = useState(1)
  const productosPorPagina = 6
  const [esMovil, setEsMovil] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setEsMovil(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('yaja_admin_auth')
    if (sesionGuardada === 'true') {
      setAutenticado(true)
    }
  }, [])

  useEffect(() => {
    if (!autenticado) return
    let isSubscribed = true
    async function cargarDatos() {
      setLoading(true)
      const [{ data: prodData }, { data: cliData }, { data: venData }] = await Promise.all([
        supabase.from('productos').select('*').order('id', { ascending: false }),
        supabase.from('clientes').select('*').order('id', { ascending: false }),
        supabase.from('ventas').select('*, clientes(nombre)').order('id', { ascending: false })
      ])
      if (isSubscribed) {
        setProductos(prodData || [])
        setClientes(cliData || [])
        setVentas(venData || [])
        setLoading(false)
      }
    }
    cargarDatos()
    return () => { isSubscribed = false }
  }, [autenticado])

  const handleLogin = (e) => {
    e.preventDefault()
    if (inputUsuario === ADMIN_USUARIO && inputClave === ADMIN_CLAVE) {
      setAutenticado(true)
      localStorage.setItem('yaja_admin_auth', 'true')
      setErrorLogin('')
    } else {
      setErrorLogin('⚠️ Usuario o contraseña incorrectos')
    }
  }

  const handleLogout = () => {
    setAutenticado(false)
    localStorage.removeItem('yaja_admin_auth')
  }

  async function fetchProductos() {
    const { data } = await supabase.from('productos').select('*').order('id', { ascending: false })
    setProductos(data || [])
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('*').order('id', { ascending: false })
    setClientes(data || [])
  }

  async function fetchVentas() {
    const { data } = await supabase.from('ventas').select('*, clientes(nombre)').order('id', { ascending: false })
    setVentas(data || [])
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

  function iniciarEdicion(prod) {
    setProductoEditando(prod.id)
    setNombre(prod.nombre || '')
    setStock(prod.stock !== undefined ? prod.stock : '')
    setPrecioEntrada(prod.precio_costo || prod.precio_entrada || '')
    setPrecioVenta(prod.precio_venta || '')
    
    if (CATEGORIAS_SUGERIDAS.includes(prod.categoria)) {
      setCategoria(prod.categoria)
      setEsNuevaCategoria(false)
      setNuevaCategoria('')
    } else {
      setCategoria('OTRA')
      setEsNuevaCategoria(true)
      setNuevaCategoria(prod.categoria || '')
    }

    setImagenUrl(prod.imagen_url || '')
    setDescripcion(prod.descripcion || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicion() {
    setProductoEditando(null)
    setNombre('')
    setStock('')
    setPrecioEntrada('')
    setPrecioVenta('')
    setCategoria('Labiales')
    setNuevaCategoria('')
    setEsNuevaCategoria(false)
    setImagenUrl('')
    setDescripcion('')
  }

  const handleSelectCategoria = (e) => {
    const val = e.target.value
    if (val === 'OTRA') {
      setEsNuevaCategoria(true)
      setCategoria('OTRA')
    } else {
      setEsNuevaCategoria(false)
      setCategoria(val)
      setNuevaCategoria('')
    }
  }

  async function handleGuardarProducto(e) {
    e.preventDefault()
    if (!nombre || stock === '' || !precioVenta) return alert('Por favor llena los campos requeridos')

    const categoriaFinal = esNuevaCategoria ? (nuevaCategoria.trim() || 'General') : categoria
    const urlFinal = esUrlValida(imagenUrl) ? imagenUrl : ''

    const datosProducto = {
      nombre,
      stock: parseInt(stock),
      precio_costo: parseFloat(precioEntrada) || 0,
      precio_venta: parseFloat(precioVenta),
      categoria: categoriaFinal,
      imagen_url: urlFinal,
      descripcion: descripcion || 'Sin descripción disponible'
    }

    try {
      if (productoEditando) {
        const { error } = await supabase
          .from('productos')
          .update(datosProducto)
          .eq('id', productoEditando)
        if (error) throw error
        alert('✏️ Producto actualizado correctamente')
      } else {
        const { error } = await supabase.from('productos').insert([datosProducto])
        if (error) throw error
        alert('✨ Nuevo producto creado exitosamente')
      }

      cancelarEdicion()
      fetchProductos()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  async function handleEliminarProducto(id, nombreProd) {
    if (!confirm(`¿Estás seguro de eliminar "${nombreProd}" del catálogo?`)) return
    try {
      const { error } = await supabase.from('productos').delete().eq('id', id)
      if (error) throw error
      setCarrito((prev) => prev.filter((item) => item.id !== id))
      if (productoEditando === id) cancelarEdicion()
      fetchProductos()
    } catch (err) {
      alert('Error al eliminar producto: ' + err.message)
    }
  }

  async function handleReiniciarContadores() {
    const confirmacion = confirm('⚠️ ¿Estás seguro de reiniciar todos los contadores de ventas y ganancias a $0?\n\nEsta acción borrará el historial de ventas acumuladas.')
    if (!confirmacion) return

    try {
      const { error } = await supabase.from('ventas').delete().neq('id', 0)
      if (error) throw error

      alert('🔄 Los contadores y el historial de ventas se han reiniciado a $0.')
      fetchVentas()
    } catch (err) {
      alert('Error al reiniciar contadores: ' + err.message)
    }
  }

  async function handleAgregarCliente(e) {
    e.preventDefault()
    if (!clienteNombre) return alert('Ingresa el nombre del cliente')
    try {
      const { error } = await supabase.from('clientes').insert([{ nombre: clienteNombre, telefono: clienteTelefono }])
      if (error) throw error
      setClienteNombre('')
      setClienteTelefono('')
      fetchClientes()
    } catch (err) {
      alert('Error al agregar cliente: ' + err.message)
    }
  }

  const agregarAlCarrito = (prod) => {
    if (prod.stock <= 0) return alert('Producto agotado')
    setCarrito((prev) => {
      const ex = prev.find((i) => i.id === prod.id)
      if (ex) {
        if (ex.cantidad >= prod.stock) return prev
        return prev.map((i) => (i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      return [...prev, { ...prod, cantidad: 1 }]
    })
  }

  const totalCarrito = carrito.reduce((t, i) => t + i.precio_venta * i.cantidad, 0)

  const registrarVenta = async () => {
    if (carrito.length === 0) return
    if (!clienteSeleccionado) return alert('Por favor selecciona un cliente')

    setProcesandoCompra(true)
    const total = totalCarrito
    const abono = parseFloat(montoAbonoInicial) || 0
    let estado = 'Debe'
    if (abono >= total) estado = 'Pagado'
    else if (abono > 0) estado = 'Abonado'

    try {
      for (const item of carrito) {
        const nuevoStock = Math.max(item.stock - item.cantidad, 0)
        await supabase.from('productos').update({ stock: nuevoStock }).eq('id', item.id)
      }

      const { error } = await supabase.from('ventas').insert([
        { cliente_id: clienteSeleccionado, total, monto_pagado: abono, estado }
      ])
      if (error) throw error

      alert('✅ Venta registrada y stock actualizado')
      setCarrito([])
      setMontoAbonoInicial('')
      fetchProductos()
      fetchVentas()
    } catch (err) {
      alert('Error en venta: ' + err.message)
    } finally {
      setProcesandoCompra(false)
    }
  }

  const registrarAbono = async (venta) => {
    const valorAbono = prompt(`Deuda actual: $${venta.total - venta.monto_pagado}. ¿Cuánto abona el cliente?`)
    if (!valorAbono || isNaN(valorAbono)) return

    const nuevoPagado = parseFloat(venta.monto_pagado) + parseFloat(valorAbono)
    let nuevoEstado = 'Abonado'
    if (nuevoPagado >= venta.total) nuevoEstado = 'Pagado'

    try {
      const { error } = await supabase
        .from('ventas')
        .update({ monto_pagado: nuevoPagado, estado: nuevoEstado })
        .eq('id', venta.id)

      if (error) throw error
      fetchVentas()
    } catch (err) {
      alert('Error al abonar: ' + err.message)
    }
  }

  if (!autenticado) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#fffcf8', fontFamily: 'sans-serif', padding: '1rem', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', padding: esMovil ? '1.5rem' : '2.5rem', borderRadius: '12px', border: '1px solid #fef3c7', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', width: '100%', maxWidth: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
            <h1 style={{ color: '#d97706', margin: '0 0 0.5rem 0', fontSize: '1.6rem' }}>💄 YAJA MAKEUP</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>Panel de Administración Privado</p>
          </div>

          {errorLogin && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
              {errorLogin}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '0.2rem' }}>Usuario:</label>
              <input 
                type="text" 
                placeholder="Ingresa tu usuario" 
                value={inputUsuario} 
                onChange={(e) => setInputUsuario(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '0.2rem' }}>Contraseña:</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={inputClave} 
                onChange={(e) => setInputClave(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem', boxSizing: 'border-box' }}
                required
              />
            </div>

            <button 
              type="submit" 
              style={{ background: '#d97706', color: 'white', padding: '0.7rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', marginTop: '0.4rem' }}
            >
              🔐 Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    )
  }

  const totalVendido = ventas.reduce((acc, v) => acc + (v.total || 0), 0)
  const totalBase = ventas.reduce((acc, v) => acc + ((v.total || 0) * 0.6), 0)
  const gananciaTotal = Math.max(totalVendido - totalBase, 0)
  const totalPorCobrar = ventas.reduce((acc, v) => acc + Math.max((v.total || 0) - (v.monto_pagado || 0), 0), 0)

  const indiceUltimo = paginaActual * productosPorPagina
  const productosActuales = productos.slice(indiceUltimo - productosPorPagina, indiceUltimo)
  const totalPaginas = Math.ceil(productos.length / productosPorPagina) || 1

  return (
    <div style={{ padding: esMovil ? '0.8rem' : '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <h1 style={{ color: '#d97706', margin: 0, fontSize: esMovil ? '1.3rem' : '1.8rem' }}>💄 YAJA MAKEUP - Admin</h1>
        
        <div style={{ display: 'flex', gap: '0.4rem', width: esMovil ? '100%' : 'auto' }}>
          <button 
            onClick={handleReiniciarContadores} 
            style={{ 
              flex: esMovil ? 1 : 'none',
              background: '#ef4444', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 0.8rem', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              fontSize: '0.8rem'
            }}
          >
            🔄 Reset ($0)
          </button>

          <button 
            onClick={handleLogout} 
            style={{ 
              flex: esMovil ? 1 : 'none',
              background: '#4b5563', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 0.8rem', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              fontSize: '0.8rem'
            }}
          >
            🔒 Salir
          </button>
        </div>
      </div>

      {/* Tarjetas Superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
          <h4 style={{ margin: '0 0 0.3rem 0', color: '#1e40af', fontSize: '0.9rem' }}>🛍️ Total Vendido</h4>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a' }}>${totalVendido.toLocaleString()}</span>
        </div>

        <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '10px', border: '1px solid #fcd34d' }}>
          <h4 style={{ margin: '0 0 0.3rem 0', color: '#b45309', fontSize: '0.9rem' }}>🛒 Total Base (Costo)</h4>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400e' }}>${Math.round(totalBase).toLocaleString()}</span>
        </div>

        <div style={{ background: '#d1fae5', padding: '1rem', borderRadius: '10px', border: '1px solid #6ee7b7' }}>
          <h4 style={{ margin: '0 0 0.3rem 0', color: '#047857', fontSize: '0.9rem' }}>📈 Ganancia Total</h4>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#065f46' }}>${Math.round(gananciaTotal).toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : '2.5fr 1fr', gap: '1.5rem' }}>
        <div>
          {/* Formulario */}
          <div style={{ background: productoEditando ? '#fffbebf0' : '#f9fafb', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', border: productoEditando ? '2px solid #f59e0b' : '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: productoEditando ? '#b45309' : '#111827', fontSize: '1rem' }}>
                {productoEditando ? '✏️ Editando Producto' : '➕ Registrar Producto'}
              </h3>
              {productoEditando && (
                <button onClick={cancelarEdicion} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                  Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleGuardarProducto} style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: esMovil ? '1fr' : '1fr 1fr' }}>
              <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ padding: '0.5rem', fontSize: '0.85rem' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <select 
                  value={categoria} 
                  onChange={handleSelectCategoria}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="Labiales">💄 Labiales</option>
                  <option value="Sérums">🧪 Sérums</option>
                  <option value="Cuidado Facial">🌸 Cuidado Facial</option>
                  <option value="Maquillaje">💅 Maquillaje</option>
                  <option value="OTRA">➕ Agregar nueva...</option>
                </select>

                {esNuevaCategoria && (
                  <input 
                    type="text" 
                    placeholder="Nueva categoría" 
                    value={nuevaCategoria} 
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #f59e0b', background: '#fffbe3', fontSize: '0.85rem' }}
                    required
                  />
                )}
              </div>

              <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} required style={{ padding: '0.5rem', fontSize: '0.85rem' }} />
              <input type="number" step="0.01" placeholder="Precio Entrada ($)" value={precioEntrada} onChange={(e) => setPrecioEntrada(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem' }} />
              <input type="number" step="0.01" placeholder="Precio Salida ($)" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} required style={{ padding: '0.5rem', fontSize: '0.85rem' }} />
              <input type="text" placeholder="URL de la imagen" value={imagenUrl} onChange={(e) => setImagenUrl(e.target.value)} style={{ gridColumn: esMovil ? 'span 1' : 'span 2', padding: '0.5rem', fontSize: '0.85rem' }} />
              <textarea placeholder="Descripción breve" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={{ gridColumn: esMovil ? 'span 1' : 'span 2', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }} rows={2} />
              <button type="submit" style={{ gridColumn: esMovil ? 'span 1' : 'span 2', background: productoEditando ? '#f59e0b' : '#d97706', color: 'white', padding: '0.6rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                {productoEditando ? '💾 Actualizar' : 'Guardar Producto'}
              </button>
            </form>
          </div>

          {/* Catálogo en tarjetas */}
          <h3 style={{ fontSize: '1.1rem' }}>Catálogo ({productos.length})</h3>
          {loading ? <p style={{ fontSize: '0.85rem' }}>Cargando inventario...</p> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: esMovil ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: esMovil ? '0.8rem' : '1rem', marginBottom: '1.2rem' }}>
                {productosActuales.map((p) => {
                  const foto = esUrlValida(p.imagen_url) ? p.imagen_url : IMAGEN_DEFAULT
                  const costo = p.precio_costo || p.precio_entrada || 0
                  const gananciaUnitaria = p.precio_venta - costo

                  return (
                    <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.6rem', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                      <button 
                        onClick={() => handleEliminarProducto(p.id, p.nombre)}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', zIndex: 2 }}
                      >
                        ✕
                      </button>

                      <div>
                        <img src={foto} alt={p.nombre || 'Producto'} onError={(e) => { e.target.onerror = null; e.target.src = IMAGEN_DEFAULT; }} style={{ width: '100%', height: esMovil ? '100px' : '130px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.4rem' }} />
                        <h4 style={{ margin: '0 0 0.2rem 0', color: '#1f2937', fontSize: esMovil ? '0.85rem' : '1rem' }}>{p.nombre}</h4>
                        
                        <div style={{ background: '#f9fafb', padding: '0.3rem', borderRadius: '4px', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                            <span>Entrada:</span>
                            <span>${costo}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#d97706' }}>
                            <span>Salida:</span>
                            <span>${p.precio_venta}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#059669', borderTop: '1px dashed #e5e7eb', marginTop: '0.2rem', paddingTop: '0.2rem' }}>
                            <span>Ganancia:</span>
                            <span>+${gananciaUnitaria}</span>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: p.stock <= 0 ? '#dc2626' : p.stock < 3 ? '#d97706' : '#059669', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                          {p.stock <= 0 ? '❌ Agotado' : `📦 Stock: ${p.stock}`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => iniciarEdicion(p)} style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}>✏️ Edit</button>
                        <button onClick={() => agregarAlCarrito(p)} disabled={p.stock <= 0} style={{ flex: 1, background: p.stock <= 0 ? '#9ca3af' : '#10b981', color: 'white', border: 'none', padding: '0.3rem', borderRadius: '4px', cursor: p.stock <= 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}>🛒 Vender</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  <button onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))} disabled={paginaActual === 1}>Anterior</button>
                  <span>Pág {paginaActual} / {totalPaginas}</span>
                  <button onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas}>Siguiente</button>
                </div>
              )}
            </>
          )}

          {/* Tabla de Historial con Desplazamiento Horizontal en Móvil */}
          <h3 style={{ fontSize: '1.1rem' }}>📋 Historial de Ventas</h3>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem', minWidth: '500px', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                  <th style={{ padding: '0.4rem' }}>Cliente</th>
                  <th style={{ padding: '0.4rem' }}>Total</th>
                  <th style={{ padding: '0.4rem' }}>Pagado</th>
                  <th style={{ padding: '0.4rem' }}>Debe</th>
                  <th style={{ padding: '0.4rem' }}>Estado</th>
                  <th style={{ padding: '0.4rem' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {ventas.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '0.8rem', color: '#9ca3af' }}>No hay ventas registradas.</td></tr>
                ) : (
                  ventas.map((v) => {
                    const debe = v.total - v.monto_pagado
                    return (
                      <tr key={v.id} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '0.4rem' }}>{v.clientes?.nombre || 'Cliente Web'}</td>
                        <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>${v.total?.toLocaleString()}</td>
                        <td style={{ padding: '0.4rem', color: '#059669' }}>${v.monto_pagado?.toLocaleString()}</td>
                        <td style={{ padding: '0.4rem', color: debe > 0 ? '#dc2626' : '#10b981', fontWeight: 'bold' }}>${debe > 0 ? debe.toLocaleString() : 0}</td>
                        <td style={{ padding: '0.4rem' }}>
                          <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', color: 'white', fontWeight: 'bold', background: v.estado === 'Pagado' ? '#10b981' : v.estado === 'Abonado' ? '#f59e0b' : '#ef4444' }}>
                            {v.estado}
                          </span>
                        </td>
                        <td style={{ padding: '0.4rem' }}>
                          {debe > 0 && (
                            <button onClick={() => registrarAbono(v)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.2rem 0.4rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>+ Abono</button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Lateral */}
        <div>
          <div style={{ background: '#f9fafb', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>👤 Nuevo Cliente</h3>
            <form onSubmit={handleAgregarCliente} style={{ display: 'grid', gap: '0.4rem' }}>
              <input type="text" placeholder="Nombre completo" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} required style={{ padding: '0.4rem', fontSize: '0.85rem' }} />
              <input type="text" placeholder="Teléfono" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.85rem' }} />
              <button type="submit" style={{ background: '#2563eb', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Guardar Cliente</button>
            </form>
          </div>

          <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem' }}>
            <h3 style={{ color: '#c53030', margin: '0 0 0.3rem 0', fontSize: '1rem' }}>📌 Fiados / Por Cobrar</h3>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#9b2c2c', marginBottom: '0.5rem' }}>
              Total Deuda: ${totalPorCobrar.toLocaleString()}
            </div>
            
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {ventas.filter(v => (v.total - v.monto_pagado) > 0).length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: '#718096' }}>🎉 ¡Nadie te debe en este momento!</p>
              ) : (
                ventas.filter(v => (v.total - v.monto_pagado) > 0).map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px dashed #fed7d7', fontSize: '0.8rem' }}>
                    <span>{v.clientes?.nombre || 'Cliente'}:</span>
                    <strong style={{ color: '#e53e3e' }}>${(v.total - v.monto_pagado).toLocaleString()}</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '0.8rem', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>🛒 Vender / Fiar</h3>
            {carrito.length === 0 ? <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Carrito vacío</p> : (
              <>
                {carrito.map((i) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span>{i.nombre} ({i.cantidad})</span>
                    <span>${i.cantidad * i.precio_venta}</span>
                  </div>
                ))}
                <hr />
                <h4 style={{ margin: '0.5rem 0' }}>Total: ${totalCarrito}</h4>

                <label><small>Asignar Cliente:</small></label>
                <select value={clienteSeleccionado} onChange={(e) => setClienteSeleccionado(e.target.value)} style={{ width: '100%', marginBottom: '0.4rem', padding: '0.4rem', fontSize: '0.85rem' }}>
                  <option value="">-- Seleccionar Cliente --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>

                <label><small>Monto Abonado ($):</small></label>
                <input 
                  type="number" 
                  placeholder="0 (Si es todo fiado)" 
                  value={montoAbonoInicial} 
                  onChange={(e) => setMontoAbonoInicial(e.target.value)}
                  style={{ width: '100%', marginBottom: '0.8rem', padding: '0.4rem', fontSize: '0.85rem' }}
                />

                <button onClick={registrarVenta} disabled={procesandoCompra} style={{ width: '100%', background: '#10b981', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Confirmar Venta
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
