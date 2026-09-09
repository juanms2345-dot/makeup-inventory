import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Conexión dinámica con las variables de entorno de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function App() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)

  // Campos del formulario
  const [nombre, setNombre] = useState('')
  const [stock, setStock] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [categoria, setCategoria] = useState('')

  useEffect(() => {
    fetchProductos()
    fetchCategorias()
  }, [])

  // 1. LISTAR PRODUCTOS (Semana 6)
  async function fetchProductos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('id', { ascending: false })
    
    if (error) console.error('Error cargando productos:', error)
    else setProductos(data || [])
    setLoading(false)
  }

  async function fetchCategorias() {
    const { data } = await supabase.from('categorias').select('*')
    if (data) setCategorias(data)
  }

  // 2. CREAR PRODUCTO (Semana 6)
  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre || !precioVenta) return alert('Por favor llena los campos requeridos')

    const { error } = await supabase.from('productos').insert([
      {
        nombre,
        stock: parseInt(stock) || 0,
        precio_venta: parseFloat(precioVenta),
        categoria: categoria || 'Cuidado Facial'
      }
    ])

    if (error) {
      alert('Error al guardar: ' + error.message)
    } else {
      alert('¡Producto guardado exitosamente!')
      setNombre('')
      setStock('')
      setPrecioVenta('')
      fetchProductos()
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#d946ef' }}>YAJA MAKEUP</h1>
        <p>Sistema de Control de Inventario y Gestión</p>
      </header>

      {/* FORMULARIO DE REGISTRO DE PRODUCTOS */}
      <section style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
        <h2 style={{ color: '#86198f', marginTop: 0 }}>Registrar Nuevo Producto</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Nombre del Producto *</label>
            <input 
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              placeholder="Ej: Sérum Hidratante"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Categoría</label>
            <select 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="">Seleccione una categoría</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Stock Cantidad</label>
            <input 
              type="number" 
              value={stock} 
              onChange={(e) => setStock(e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              placeholder="0"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Precio de Venta ($) *</label>
            <input 
              type="number" 
              step="0.01" 
              value={precioVenta} 
              onChange={(e) => setPrecioVenta(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              placeholder="15000"
            />
          </div>

          <button 
            type="submit" 
            style={{ 
              gridColumn: 'span 2', 
              padding: '12px', 
              background: '#c026d3', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            Guardar Producto en Inventario
          </button>
        </form>
      </section>

      {/* TABLA DE PRODUCTOS LISTADOS DESDE SUPABASE */}
      <section>
        <h2 style={{ color: '#334155' }}>Inventario de Productos ({productos.length})</h2>
        {loading ? <p>Cargando datos desde Supabase...</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>ID</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>Producto</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>Categoría</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>Stock</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>Precio Venta</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((prod) => (
                  <tr key={prod.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>{prod.id}</td>
                    <td style={{ padding: '10px', fontWeight: '500' }}>{prod.nombre}</td>
                    <td style={{ padding: '10px' }}>{prod.categoria || 'General'}</td>
                    <td style={{ padding: '10px' }}>{prod.stock}</td>
                    <td style={{ padding: '10px', color: '#16a34a', fontWeight: 'bold' }}>
                      ${prod.precio_venta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
