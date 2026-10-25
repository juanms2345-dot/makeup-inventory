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

  // NUEVO: Buscador en el Admin para filtrar productos
  const [busquedaAdmin, setBusquedaAdmin] = useState('')

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

  // NUEVO: Función para descargar reporte de cuentas en CSV (Excel)
  const descargarReporteCSV = () => {
    if (ventas.length === 0) return alert('No hay ventas registradas para exportar.')
    
    let csvContent = "data:text/csv;charset=utf-8,ID Venta,Cliente,Total Venta,Monto Pagado,Deuda,Estado\n"
    ventas.forEach(v => {
      const debe = v.total - v.monto_pagado
      const nombreCliente = (v.clientes?.nombre || 'Cliente Web').replace(/,/g, '')
      csvContent += `${v.id},${nombreCliente},${v.total},${v.monto_pagado},${debe},${v.estado}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "reporte_cuentas_yaja_makeup.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
      alert(`🗑️ El producto "${nombreProd}" se ha eliminado correctamente.`)
    } catch (err) {
      alert('Error al eliminar producto: ' + err.message)
    }
  }
  

  async function handleReiniciarContadores() {
    const confirmacion = confirm('⚠️ ¿Estás seguro de reiniciar todos los contadores de ventas y ganancias a $0?')
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
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #fef3c7', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', width: '100%', maxWidth: '380px', boxSizing: 'border-box' }}>
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
              style={{ background: '#d97706', color: 'white', padding: '0.7rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', marginTop: '0.4rem', width: '100%', boxSizing: 'border-box' }}
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

  // Filtrado de productos en el Admin mediante el buscador
  const productosFiltradosAdmin = productos.filter((p) => {
    const nombreProd = p.nombre ? p.nombre.toLowerCase() : ''
    const catProd = p.categoria ? p.categoria.toLowerCase() : ''
    const query = busquedaAdmin.toLowerCase()
    return nombreProd.includes(query) || catProd.includes(query)
  })

  const indiceUltimo = paginaActual * productosPorPagina
  const productosActuales = productosFiltradosAdmin.slice(indiceUltimo - productosPorPagina, indiceUltimo)
  const totalPaginas = Math.ceil(productosFiltradosAdmin.length / productosPorPagina) || 1

  return (
    <div style={{ padding: esMovil ? '0.6rem' : '1.5rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <h1 style={{ color: '#d97706', margin: 0, fontSize: esMovil ? '1.2rem' : '1.8rem' }}>💄 YAJA MAKEUP - Admin</h1>
        
        <div style={{ display: 'flex', gap: '0.4rem', width: esMovil ? '100%' : 'auto', flexWrap: 'wrap' }}>
          {/* NUEVO: Botón Descargar Reporte */}
          <button 
            onClick={descargarReporteCSV} 
            style={{ 
              flex: 1,
              background: '#059669', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 0.6rem', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              fontSize: '0.8rem'
            }}
          >
            📥 Descargar Cuentas
          </button>

          <button 
            onClick={handleReiniciarContadores} 
            style={{ 
              flex: 1,
              background: '#ef4444', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 0.6rem', 
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
              flex: 1,
              background: '#4b5563', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 0.6rem', 
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem', marginBottom: '1.2rem' }}>
        <div style={{ background: '#eff6ff', padding: '0.9rem', borderRadius: '10px', border: '1px solid #bfdbfe', boxSizing: 'border-box' }}>
          <h4 style={{ margin: '0 0 0.2rem 0', color: '#1e40af', fontSize: '0.85rem' }}>🛍️ Total Vendido</h4>
          <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e3a8a' }}>${totalVendido.toLocaleString()}</span>
        </div>

        <div style={{ background: '#fef3c7', padding: '0.9rem', borderRadius: '10px', border: '1px solid #fcd34d', boxSizing: 'border-box' }}>
          <h4 style={{ margin: '0 0 0.2rem 0', color: '#b45309', fontSize: '0.85rem' }}>🛒 Total Base (Costo)</h4>
          <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#92400e' }}>${Math.round(totalBase).toLocaleString()}</span>
        </div>

        <div style={{ background: '#d1fae5', padding: '0.9rem', borderRadius: '10px', border: '1px solid #6ee7b7', boxSizing: 'border-box' }}>
          <h4 style={{ margin: '0 0 0.2rem 0', color: '#047857', fontSize: '0.85rem' }}>📈 Ganancia Total</h4>
          <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#065f46' }}>${Math.round(gananciaTotal).toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', boxSizing: 'border-box' }}>
        
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          {/* Formulario */}
          <div style={{ background: productoEditando ? '#fffbebf0' : '#f9fafb', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', border: productoEditando ? '2px solid #f59e0b' : '1px solid #e5e7eb', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: productoEditando ? '#b45309' : '#111827', fontSize: '0.95rem' }}>
                {productoEditando ? '✏️ Editando Producto' : '➕ Registrar Producto'}
              </h3>
              {productoEditando && (
                <button onClick={cancelarEdicion} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                  Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleGuardarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', boxSizing: 'border-box' }}>
              <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%', boxSizing: 'border-box' }}>
                <select 
                  value={categoria} 
                  onChange={handleSelectCategoria}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: '#fff', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
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
                    style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #f59e0b', background: '#fffbe3', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                    required
                  />
                )}
              </div>

              <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} required style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
              <input type="number" step="0.01" placeholder="Precio Entrada ($)" value={precioEntrada} onChange={(e) => setPrecioEntrada(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
              <input type="number" step="0.01" placeholder="Precio Salida ($)" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} required style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
              <input type="text" placeholder="URL de la imagen" value={imagenUrl} onChange={(e) => setImagenUrl(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
              <textarea placeholder="Descripción breve" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} rows={2} />
              
              <button type="submit" style={{ background: productoEditando ? '#f59e0b' : '#d97706', color: 'white', padding: '0.6rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}>
                {productoEditando ? '💾 Actualizar' : 'Guardar Producto'}
              </button>
            </form>
          </div>

          {/* NUEVO: Buscador en el Admin para filtrar y editar productos */}
          <div style={{ marginBottom: '1rem', boxSizing: 'border-box' }}>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.4rem 0' }}>🔍 Buscar producto para editar ({productosFiltradosAdmin.length})</h3>
            <input 
              type="text" 
              placeholder="Escribe el nombre o categoría a buscar..." 
              value={busquedaAdmin}
              onChange={(e) => { setBusquedaAdmin(e.target.value); setPaginaActual(1); }}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #fcd34d', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Catálogo en tarjetas */}
          {loading ? <p style={{ fontSize: '0.85rem' }}>Cargando inventario...</p> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '0.6rem', marginBottom: '1rem', width: '100%', boxSizing: 'border-box' }}>
                {productosActuales.map((p) => {
                  const foto = esUrlValida(p.imagen_url) ? p.imagen_url : IMAGEN_DEFAULT
                  const costo = p.precio_costo || p.precio_entrada || 0
                  const gananciaUnitaria = p.precio_venta - costo

                  return (
                    <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.5rem', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', boxSizing: 'border-box' }}>
                      <button 
                        onClick={() => handleEliminarProducto(p.id, p.nombre)}
                        style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem', zIndex: 2 }}
                      >
                        ✕
                      </button>

                      <div>
                        <img src={foto} alt={p.nombre || 'Producto'} onError={(e) => { e.target.onerror = null; e.target.src = IMAGEN_DEFAULT; }} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.3rem' }} />
                        <h4 style={{ margin: '0 0 0.2rem 0', color: '#1f2937', fontSize: '0.8rem', wordBreak: 'break-word' }}>{p.nombre}</h4>
                        
                        <div style={{ background: '#f9fafb', padding: '0.25rem', borderRadius: '4px', marginBottom: '0.3rem', fontSize: '0.7rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                            <span>Entrada:</span>
                            <span>${costo}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#d97706' }}>
                            <span>Salida:</span>
                            <span>${p.precio_venta}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#059669', borderTop: '1px dashed #e5e7eb', marginTop: '0.15rem', paddingTop: '0.15rem' }}>
                            <span>Ganancia:</span>
                            <span>+${gananciaUnitaria}</span>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.7rem', color: p.stock <= 0 ? '#dc2626' : p.stock < 3 ? '#d97706' : '#059669', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                          {p.stock <= 0 ? '❌ Agotado' : `📦 Stock: ${p.stock}`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={() => iniciarEdicion(p)} style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '0.25rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}>✏️ Edit</button>
                        <button onClick={() => agregarAlCarrito(p)} disabled={p.stock <= 0} style={{ flex: 1, background: p.stock <= 0 ? '#9ca3af' : '#10b981', color: 'white', border: 'none', padding: '0.25rem', borderRadius: '4px', cursor: p.stock <= 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}>🛒 Vender</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', fontSize: '0.8rem' }}>
                  <button onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))} disabled={paginaActual === 1}>Anterior</button>
                  <span>Pág {paginaActual} / {totalPaginas}</span>
                  <button onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas}>Siguiente</button>
                </div>
              )}
            </>
          )}

          {/* Tabla de Historial con Scroll Horizontal */}
          <h3 style={{ fontSize: '1.05rem', margin: '1rem 0 0.4rem 0' }}>📋 Historial de Ventas</h3>
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1.2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '450px', fontSize: '0.8rem' }}>
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
                          <span style={{ padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem', color: 'white', fontWeight: 'bold', background: v.estado === 'Pagado' ? '#10b981' : v.estado === 'Abonado' ? '#f59e0b' : '#ef4444' }}>
                            {v.estado}
                          </span>
                        </td>
                        <td style={{ padding: '0.4rem' }}>
                          {debe > 0 && (
                            <button onClick={() => registrarAbono(v)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.2rem 0.35rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>+ Abono</button>
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

        {/* Sección Derecha (Clientes, Fiados, Carrito / Vender) */}
        <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div style={{ background: '#f9fafb', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e5e7eb', boxSizing: 'border-box' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>👤 Nuevo Cliente</h3>
            <form onSubmit={handleAgregarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', boxSizing: 'border-box' }}>
              <input type="text" placeholder="Nombre completo" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} required style={{ padding: '0.4rem', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
              <input type="text" placeholder="Teléfono" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
              <button type="submit" style={{ background: '#2563eb', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}>Guardar Cliente</button>
            </form>
          </div>

          <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', padding: '0.8rem', borderRadius: '8px', boxSizing: 'border-box' }}>
            <h3 style={{ color: '#c53030', margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>📌 Fiados / Por Cobrar</h3>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#9b2c2c', marginBottom: '0.4rem' }}>
              Total Deuda: ${totalPorCobrar.toLocaleString()}
            </div>
            
            <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
              {ventas.filter(v => (v.total - v.monto_pagado) > 0).length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: '#718096' }}>🎉 ¡Nadie te debe en este momento!</p>
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

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '0.8rem', borderRadius: '8px', boxSizing: 'border-box' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>🛒 Vender / Fiar</h3>
            {carrito.length === 0 ? <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Carrito vacío</p> : (
              <>
                {carrito.map((i) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span>{i.nombre} ({i.cantidad})</span>
                    <span>${i.cantidad * i.precio_venta}</span>
                  </div>
                ))}
                <hr />
                <h4 style={{ margin: '0.4rem 0' }}>Total: ${totalCarrito}</h4>

                <label><small>Asignar Cliente:</small></label>
                <select value={clienteSeleccionado} onChange={(e) => setClienteSeleccionado(e.target.value)} style={{ width: '100%', marginBottom: '0.4rem', padding: '0.4rem', fontSize: '0.85rem', boxSizing: 'border-box' }}>
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
                  style={{ width: '100%', marginBottom: '0.8rem', padding: '0.4rem', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />

                <button onClick={registrarVenta} disabled={procesandoCompra} style={{ width: '100%', background: '#10b981', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', boxSizing: 'border-box' }}>
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
