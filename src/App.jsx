import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const IMAGEN_DEFAULT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%239ca3af'>Sin Imagen</text></svg>"

const CATEGORIAS_SUGERIDAS = ['Labiales', 'Sérums', 'Cuidado Facial', 'Maquillaje']

// CREDENCIALES DE ACCESO AL PANEL DE ADMINISTRACIÓN
const ADMIN_USUARIO = "admin"
const ADMIN_CLAVE = "yaja123" // Puedes cambiar tu contraseña aquí

export default function App() {
  // Estado de Autenticación / Sesión
  const [autenticado, setAutenticado] = useState(false)
  const [inputUsuario, setInputUsuario] = useState('')
  const [inputClave, setInputClave] = useState('')
  const [errorLogin, setErrorLogin] = useState('')

  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)

  // Formulario de Registro / Edición de Productos
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

  // Formulario Clientes
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')

  // Selección en Venta
  const [clienteSeleccionado, setClienteSeleccionado] = useState('')
  const [montoAbonoInicial, setMontoAbonoInicial] = useState('')

  // Carrito de compras
  const [carrito, setCarrito] = useState([])
  const [procesandoCompra, setProcesandoCompra] = useState(false)

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const productosPorPagina = 6

  // Verificar si ya había iniciado sesión previamente
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

  // Lógica de Inicio de Sesión
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

  // Lógica de Cerrar Sesión
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

  // Cargar datos en el formulario para EDITAR
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

  // Manejar cambio de categoría
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

  // Guardar (Crear o Actualizar) Producto
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

  // Eliminar Producto
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

  // REINICIAR CONTADORES Y LIMPIAR VENTAS
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

  // Guardar Cliente
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

  // Carrito
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

  // Registrar Venta Manual desde el Admin
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

  // Registrar Abono
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

  // PANTALLA DE INICIO DE SESIÓN (LOGIN) SI NO ESTÁ AUTENTICADO
  if (!autenticado) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#fffcf8', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '12px', border: '1px solid #fef3c7', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', width: '100%', maxWidth: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{ color: '#d97706', margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>💄 YAJA MAKEUP</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>Panel de Administración Privado</p>
          </div>

          {errorLogin && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
              {errorLogin}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Usuario:</label>
              <input 
                type="text" 
                placeholder="Ingresa tu usuario" 
                value={inputUsuario} 
                onChange={(e) => setInputUsuario(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Contraseña:</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={inputClave} 
                onChange={(e) => setInputClave(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
                required
              />
            </div>

            <button 
              type="submit" 
              style={{ background: '#d97706', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}
            >
              🔐 Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    )
  }

  // CÁLCULOS DE MÉTRICAS FINANCIERAS
  const totalVendido = ventas.reduce((acc, v) => acc + (v.total || 0), 0)
  
  const totalBase = ventas.reduce((acc, v) => {
    return acc + ((v.total || 0) * 0.6) 
  }, 0)

  const gananciaTotal = Math.max(totalVendido - totalBase, 0)
  const totalPorCobrar = ventas.reduce((acc, v) => acc + Math.max((v.total || 0) - (v.monto_pagado || 0), 0), 0)

  // Paginación
  const indiceUltimo = paginaActual * productosPorPagina
  const productosActuales = productos.slice(indiceUltimo - productosPorPagina, indiceUltimo)
  const totalPaginas = Math.ceil(productos.length / productosPorPagina) || 1

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ color: '#d97706', margin: 0 }}>💄 YAJA MAKEUP - Panel Administrador</h1>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handleReiniciarContadores} 
            style={{ 
              background: '#ef4444', 
              color: 'white', 
              border: 'none', 
              padding: '0.6rem 1rem', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            🔄 Reiniciar Contadores ($0)
          </button>

          <button 
            onClick={handleLogout} 
            style={{ 
              background: '#4b5563', 
              color: 'white', 
              border: 'none', 
              padding: '0.6rem 1rem', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            🔒 Cerrar Sesión
          </button>
        </div>
      </div>

      {/* TARJETAS SUPERIORES DE MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#eff6ff', padding: '1.2rem', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>🛍️ Total Vendido (Salida)</h4>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e3a8a' }}>${totalVendido.toLocaleString()}</span>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#2563eb' }}>Valor bruto acumulado</p>
        </div>

        <div style={{ background: '#fef3c7', padding: '1.2rem', borderRadius: '10px', border: '1px solid #fcd34d' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#b45309' }}>🛒 Total Base (Entrada/Costo)</h4>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#92400e' }}>${Math.round(totalBase).toLocaleString()}</span>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#b45309' }}>Costo de mercancía vendida</p>
        </div>

        <div style={{ background: '#d1fae5', padding: '1.2rem', borderRadius: '10px', border: '1px solid #6ee7b7' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#047857' }}>📈 Ganancia Total Generada</h4>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#065f46' }}>${Math.round(gananciaTotal).toLocaleString()}</span>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#047857' }}>Ganancia neta (Salida - Base)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '2rem' }}>
        <div>
          {/* Formulario de Registro / Edición de Producto */}
          <div style={{ background: productoEditando ? '#fffbebf0' : '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: productoEditando ? '2px solid #f59e0b' : '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: productoEditando ? '#b45309' : '#111827' }}>
                {productoEditando ? '✏️ Editando Producto' : '➕ Registrar Nuevo Producto'}
              </h3>
              {productoEditando && (
                <button onClick={cancelarEdicion} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Cancelar Edición
                </button>
              )}
            </div>

            <form onSubmit={handleGuardarProducto} style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr' }}>
              <input type="text" placeholder="Nombre del producto" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <select 
                  value={categoria} 
                  onChange={handleSelectCategoria}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: '#fff', fontSize: '0.9rem' }}
                >
                  <option value="Labiales">💄 Labiales</option>
                  <option value="Sérums">🧪 Sérums</option>
                  <option value="Cuidado Facial">🌸 Cuidado Facial</option>
                  <option value="Maquillaje">💅 Maquillaje</option>
                  <option value="OTRA">➕ Agregar nueva categoría...</option>
                </select>

                {esNuevaCategoria && (
                  <input 
                    type="text" 
                    placeholder="Escribe la nueva categoría" 
                    value={nuevaCategoria} 
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #f59e0b', background: '#fffbe3' }}
                    required
                  />
                )}
              </div>

              <input type="number" placeholder="Stock disponible" value={stock} onChange={(e) => setStock(e.target.value)} required />
              
              <input 
                type="number" 
                step="0.01" 
                placeholder="Precio Entrada (Costo Compra $)" 
                value={precioEntrada} 
                onChange={(e) => setPrecioEntrada(e.target.value)} 
              />

              <input 
                type="number" 
                step="0.01" 
                placeholder="Precio Salida (Venta Cliente $)" 
                value={precioVenta} 
                onChange={(e) => setPrecioVenta(e.target.value)} 
                required 
              />

              <input 
                type="text" 
                placeholder="URL de la imagen (Ej: https://misitio.com/foto.jpg)" 
                value={imagenUrl} 
                onChange={(e) => setImagenUrl(e.target.value)} 
                style={{ gridColumn: 'span 2' }}
              />
              <textarea 
                placeholder="¿Para qué sirve? (Descripción breve)" 
                value={descripcion} 
                onChange={(e) => setDescripcion(e.target.value)} 
                style={{ gridColumn: 'span 2', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                rows={2}
              />
              <button type="submit" style={{ gridColumn: 'span 2', background: productoEditando ? '#f59e0b' : '#d97706', color: 'white', padding: '0.6rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                {productoEditando ? '💾 Actualizar Producto' : 'Guardar Producto'}
              </button>
            </form>
          </div>

          {/* Catálogo en tarjetas */}
          <h3>Catálogo de Productos ({productos.length})</h3>
          {loading ? <p>Cargando inventario...</p> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {productosActuales.map((p) => {
                  const foto = esUrlValida(p.imagen_url) ? p.imagen_url : IMAGEN_DEFAULT
                  const costo = p.precio_costo || p.precio_entrada || 0
                  const gananciaUnitaria = p.precio_venta - costo

                  return (
                    <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.8rem', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                      <button 
                        onClick={() => handleEliminarProducto(p.id, p.nombre)}
                        title="Eliminar producto"
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '26px',
                          height: '26px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2
                        }}
                      >
                        ✕
                      </button>

                      <div>
                        <img 
                          src={foto} 
                          alt={p.nombre || 'Producto'} 
                          onError={(e) => { 
                            e.target.onerror = null; 
                            e.target.src = IMAGEN_DEFAULT; 
                          }}
                          style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.5rem' }} 
                        />
                        <h4 style={{ margin: '0 0 0.2rem 0', color: '#1f2937', paddingRight: '20px' }}>{p.nombre}</h4>
                        <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#b45309', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
                          {p.categoria || 'General'}
                        </span>
                        <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '0.4rem 0' }}>
                          💡 <strong>Uso:</strong> {p.descripcion || 'Sin descripción'}
                        </p>
                        
                        <div style={{ background: '#f9fafb', padding: '0.4rem', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                            <span>Entrada (Costo):</span>
                            <span>${costo}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#d97706' }}>
                            <span>Salida (Venta):</span>
                            <span>${p.precio_venta}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#059669', borderTop: '1px dashed #e5e7eb', marginTop: '0.2rem', paddingTop: '0.2rem' }}>
                            <span>Ganancia c/u:</span>
                            <span>+${gananciaUnitaria}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                          <span style={{ color: p.stock <= 0 ? '#dc2626' : p.stock < 3 ? '#d97706' : '#059669', fontWeight: 'bold' }}>
                            {p.stock <= 0 ? '❌ Agotado (0)' : `📦 Quedan: ${p.stock}`}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button 
                          onClick={() => iniciarEdicion(p)}
                          style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                        >
                          ✏️ Editar
                        </button>
                        <button 
                          onClick={() => agregarAlCarrito(p)} 
                          disabled={p.stock <= 0} 
                          style={{ 
                            flex: 1,
                            background: p.stock <= 0 ? '#9ca3af' : '#10b981', 
                            color: 'white', 
                            border: 'none', 
                            padding: '0.4rem', 
                            borderRadius: '4px', 
                            cursor: p.stock <= 0 ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                          }}
                        >
                          🛒 Vender
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <button onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))} disabled={paginaActual === 1}>Anterior</button>
                  <span>Página {paginaActual} de {totalPaginas}</span>
                  <button onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas}>Siguiente</button>
                </div>
              )}
            </>
          )}

          {/* TABLA DE HISTORIAL DE VENTAS */}
          <h3>📋 Historial de Ventas</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Cliente</th>
                <th style={{ padding: '0.5rem' }}>Total</th>
                <th style={{ padding: '0.5rem' }}>Pagado</th>
                <th style={{ padding: '0.5rem' }}>Debe</th>
                <th style={{ padding: '0.5rem' }}>Estado</th>
                <th style={{ padding: '0.5rem' }}>Abonar</th>
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af' }}>No hay ventas registradas aún. Contadores en $0.</td></tr>
              ) : (
                ventas.map((v) => {
                  const debe = v.total - v.monto_pagado
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '0.5rem', fontWeight: '500' }}>{v.clientes?.nombre || 'Cliente Web / WhatsApp'}</td>
                      <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>${v.total?.toLocaleString()}</td>
                      <td style={{ padding: '0.5rem', color: '#059669' }}>${v.monto_pagado?.toLocaleString()}</td>
                      <td style={{ padding: '0.5rem', color: debe > 0 ? '#dc2626' : '#10b981', fontWeight: 'bold' }}>
                        ${debe > 0 ? debe.toLocaleString() : 0}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: 'white', fontWeight: 'bold',
                          background: v.estado === 'Pagado' ? '#10b981' : v.estado === 'Abonado' ? '#f59e0b' : '#ef4444' 
                        }}>
                          {v.estado}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        {debe > 0 && (
                          <button onClick={() => registrarAbono(v)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            + Abono
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PANEL LATERAL */}
        <div>
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
            <h3>👤 Nuevo Cliente</h3>
            <form onSubmit={handleAgregarCliente} style={{ display: 'grid', gap: '0.5rem' }}>
              <input type="text" placeholder="Nombre completo" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} required />
              <input type="text" placeholder="Teléfono" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} />
              <button type="submit" style={{ background: '#2563eb', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar Cliente</button>
            </form>
          </div>

          <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#c53030', margin: '0 0 0.5rem 0' }}>📌 Fiados / Por Cobrar</h3>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#9b2c2c', marginBottom: '0.8rem' }}>
              Total Deuda: ${totalPorCobrar.toLocaleString()}
            </div>
            
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#742a2a' }}>Desglose por clientes debiendo:</label>
            <div style={{ marginTop: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {ventas.filter(v => (v.total - v.monto_pagado) > 0).length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: '#718096' }}>🎉 ¡Nadie te debe en este momento!</p>
              ) : (
                ventas.filter(v => (v.total - v.monto_pagado) > 0).map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px dashed #fed7d7', fontSize: '0.85rem' }}>
                    <span>{v.clientes?.nombre || 'Cliente'}:</span>
                    <strong style={{ color: '#e53e3e' }}>${(v.total - v.monto_pagado).toLocaleString()}</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '8px' }}>
            <h3>🛒 Vender / Fiar</h3>
            {carrito.length === 0 ? <p style={{ color: '#6b7280' }}>Carrito vacío</p> : (
              <>
                {carrito.map((i) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>{i.nombre} ({i.cantidad})</span>
                    <span>${i.cantidad * i.precio_venta}</span>
                  </div>
                ))}
                <hr />
                <h4>Total: ${totalCarrito}</h4>

                <label><small>Asignar Cliente:</small></label>
                <select value={clienteSeleccionado} onChange={(e) => setClienteSeleccionado(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.4rem' }}>
                  <option value="">-- Seleccionar Cliente --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>

                <label><small>Monto Abonado / Pagado ($):</small></label>
                <input 
                  type="number" 
                  placeholder="0 (Si es todo fiado)" 
                  value={montoAbonoInicial} 
                  onChange={(e) => setMontoAbonoInicial(e.target.value)}
                  style={{ width: '100%', marginBottom: '1rem', padding: '0.4rem' }}
                />

                <button onClick={registrarVenta} disabled={procesandoCompra} style={{ width: '100%', background: '#10b981', color: 'white', padding: '0.6rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
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
