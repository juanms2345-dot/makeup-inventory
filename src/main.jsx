import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react_router_dom'
import App from './App.jsx'       // Panel de Administración
import Cliente from './Cliente.jsx' // Catálogo para Clientes

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* La URL principal para tus clientes */}
        <Route path="/" element={<Cliente />} />

        {/* Tu panel privado de administración */}
        <Route path="/admin" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
