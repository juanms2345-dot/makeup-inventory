import  { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Variables de entorno de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://veefpcwcrorenobsqwlf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function App() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  // Campos del formulario
  const [nombre, setNombre] = useState('')
  const [stock, setStock] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [categoria, setCategoria] = useState('')

  useEffect(() => {
    fetchProductos()
  }, [])

  async function fetchProductos() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('productos').select('*')
      if (error) throw error
      setProductos(data || [])
    } catch (err) {
      console.error('Error al cargar productos:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAgregar(e) {
    e.preventDefault()
    if (!nombre || !stock || !precioVenta) return alert('Por favor llena los campos requeridos')

    try {
      const { error } = await supabase.from('productos').insert([
        {
          nombre,
          stock: parseInt(stock),
          precio_venta: parseFloat(precioVenta),
          categoria: categoria || 'General'
        }
      ])

      if (error) throw error

      setNombre('')
      setStock('')
      setPrecioVenta('')
      setCategoria('')
      fetchProductos()
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Deseas eliminar este producto?')) return
    try {
      const { error } = await supabase.from('productos').delete().eq('id', id)
      if (error) throw error
      fetchProductos()
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ color: '#d97706' }}>💄 YAJA MAKEUP - Inventario</h1>
      
      {/* Formulario de registro */}
      <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
        <h3>Agregar Nuevo Producto</h3>
        <form onSubmit={handleAgregar} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
          <input 
            type="text" 
            placeholder="Nombre del producto" 
            value={nombre} 
            onChange={(e) => setNombre(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            required 
          />
          <input 
            type="text" 
            placeholder="Categoría (ej. Labiales, Sombras)" 
            value={categoria} 
            onChange={(e) => setCategoria(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input 
            type="number" 
            placeholder="Cantidad en Stock" 
            value={stock} 
            onChange={(e) => setStock(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            required 
          />
          <input 
            type="number" 
            step="0.01" 
            placeholder="Precio de Venta ($)" 
            value={precioVenta} 
            onChange={(e) => setPrecioVenta(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            required 
          />
          <button 
            type="submit" 
            style={{ gridColumn: 'span 2', padding: '0.75rem', background: '#d97706', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Guardar Producto
          </button>
        </form>
      </div>

      {/* Tabla de Productos */}
      <div>
        <h3>Lista de Inventario</h3>
        {loading ? (
          <p>Cargando inventario...</p>
        ) : productos.length === 0 ? (
          <p>No hay productos registrados en el inventario.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem' }}>Nombre</th>
                <th style={{ padding: '0.75rem' }}>Categoría</th>
                <th style={{ padding: '0.75rem' }}>Stock</th>
                <th style={{ padding: '0.75rem' }}>Precio</th>
                <th style={{ padding: '0.75rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((prod) => (
                <tr key={prod.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem' }}>{prod.nombre}</td>
                  <td style={{ padding: '0.75rem' }}>{prod.categoria || 'N/A'}</td>
                  <td style={{ padding: '0.75rem' }}>{prod.stock}</td>
                  <td style={{ padding: '0.75rem' }}>${prod.precio_venta}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button 
                      onClick={() => handleEliminar(prod.id)}
                      style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
