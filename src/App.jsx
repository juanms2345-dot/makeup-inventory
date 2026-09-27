import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const IMAGEN_DEFAULT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%239ca3af'>Sin Imagen</text></svg>"

export default function App() {
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)

  // Formulario Productos
  const [nombre, setNombre] = useState('')
  const [stock, setStock] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [categoria, setCategoria] = useState('')
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

  useEffect(() => {
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
  }, [])

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

  // Guardar Producto
  async function handleAgregarProducto(e) {
    e.preventDefault()
    if (!nombre || !stock || !precioVenta) return alert('Por favor llena los campos requeridos')
    
    const urlFinal = esUrlValida(imagenUrl) ? imagenUrl : ''

    try {
      const { error } = await supabase.from('productos').insert([
        {
          nombre,
          stock: parseInt(stock),
          precio_venta: parseFloat(precioVenta),
          categoria: categoria || 'General',
          imagen_url: urlFinal,
          descripcion: descripcion || 'Sin descripción disponible'
        }
      ])
      if (error) throw error
      setNombre('')
      setStock('')
      setPrecioVenta('')
      setCategoria('')
      setImagenUrl('')
      setDescripcion('')
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
      fetchProductos()
    } catch (err) {
      alert('Error al eliminar producto: ' + err.message)
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

  // Registrar Venta
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
        const nuevoStock = item.stock - item.cantidad
        await supabase.from('productos').update({ stock: nuevoStock }).eq('id', item.id)
      }

      const { error } = await supabase.from('ventas').insert([
        { cliente_id: clienteSeleccionado, total, monto_pagado: abono, estado }
      ])
      if (error) throw error

      alert('✅ Venta registrada con éxito')
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

  // Paginación
  const indiceUltimo = paginaActual * productosPorPagina
  const productosActuales = productos.slice(indiceUltimo - productosPorPagina, indiceUltimo)
  const totalPaginas = Math.ceil(productos.length / productosPorPagina) || 1

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      <h1 style={{ color: '#d97706' }}>💄 YAJA MAKEUP - Panel Administrador</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '2rem' }}>
        <div>
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
            <h3>Registrar Nuevo Producto</h3>
            <form onSubmit={handleAgregarProducto} style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr' }}>
              <input type="text" placeholder="Nombre del producto" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              <input type="text" placeholder="Categoría (ej. Labiales)" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
              <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} required />
              <input type="number" step="0.01" placeholder="Precio ($)" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} required />
              <input 
                type="text" 
                placeholder="URL de la imagen (Link https://...)" 
                value={imagenUrl} 
                onChange={(e) => setImagenUrl(e.target.value)} 
                style={{ gridColumn: 'span 2' }}
              />
              <textarea 
                placeholder="¿Para qué sirve? (Descripción breve del beneficio)" 
                value={descripcion} 
                onChange={(e) => setDescripcion(e.target.value)} 
                style={{ gridColumn: 'span 2', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                rows={2}
              />
              <button type="submit" style={{ gridColumn: 'span 2', background: '#d97706', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Guardar Producto</button>
            </form>
          </div>

          <h3>Catálogo de Productos ({productos.length})</h3>
          {loading ? <p>Cargando inventario...</p> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {productosActuales.map((p) => {
                  const foto = esUrlValida(p.imagen_url) ? p.imagen_url : IMAGEN_DEFAULT

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
                          style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.5rem' }} 
                        />
                        <h4 style={{ margin: '0 0 0.2rem 0', color: '#1f2937', paddingRight: '20px' }}>{p.nombre}</h4>
                        <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: '0 0 0.5rem 0' }}>
                          💡 <strong>Servicio/Uso:</strong> {p.descripcion || 'Sin descripción'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 'bold', color: '#d97706' }}>${p.precio_venta}</span>
                          <span style={{ fontSize: '0.8rem', color: p.stock < 2 ? '#dc2626' : '#6b7280', fontWeight: p.stock < 2 ? 'bold' : 'normal' }}>
                            {p.stock < 2 ? `⚠️ Stock: ${p.stock}` : `Stock: ${p.stock}`}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => agregarAlCarrito(p)} 
                        disabled={p.stock <= 0} 
                        style={{ 
                          width: '100%', 
                          background: p.stock <= 0 ? '#9ca3af' : '#10b981', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.4rem', 
                          borderRadius: '4px', 
                          cursor: p.stock <= 0 ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {p.stock <= 0 ? 'Agotado' : '🛒 Añadir al Carrito'}
                      </button>
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

          <h3>📋 Cuentas de Clientes (Fiados y Pagos)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th>Cliente</th><th>Total</th><th>Pagado</th><th>Debe</th><th>Estado</th><th>Abonar</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => {
                const debe = v.total - v.monto_pagado
                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td>{v.clientes?.nombre || 'Cliente'}</td>
                    <td>${v.total}</td>
                    <td>${v.monto_pagado}</td>
                    <td style={{ color: debe > 0 ? '#dc2626' : '#10b981', fontWeight: 'bold' }}>${debe > 0 ? debe : 0}</td>
                    <td>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: 'white',
                        background: v.estado === 'Pagado' ? '#10b981' : v.estado === 'Abonado' ? '#f59e0b' : '#ef4444' 
                      }}>
                        {v.estado}
                      </span>
                    </td>
                    <td>
                      {debe > 0 && (
                        <button onClick={() => registrarAbono(v)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                          + Abono
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
            <h3>👤 Nuevo Cliente</h3>
            <form onSubmit={handleAgregarCliente} style={{ display: 'grid', gap: '0.5rem' }}>
              <input type="text" placeholder="Nombre completo" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} required />
              <input type="text" placeholder="Teléfono" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} />
              <button type="submit" style={{ background: '#2563eb', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '4px' }}>Guardar Cliente</button>
            </form>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '8px' }}>
            <h3>🛒 Vender / Fiar</h3>
            {carrito.length === 0 ? <p>Carrito vacío</p> : (
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

                <button onClick={registrarVenta} disabled={procesandoCompra} style={{ width: '100%', background: '#10b981', color: 'white', padding: '0.6rem', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
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
