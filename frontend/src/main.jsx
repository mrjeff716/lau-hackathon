// =============================================================================
// main.jsx — the very first file the browser runs. It mounts the React app
// into <div id="root"> in index.html and wraps it with app-wide helpers.
// =============================================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // Tailwind styles
import App from './App.jsx'
import { BrowserRouter } from 'react-router'
import { Toaster } from "react-hot-toast"
import AuthProvider from './auth/AuthProvider.jsx'

createRoot(document.getElementById('root')).render(
  // StrictMode: extra checks during development only (no effect in production)
  <StrictMode>
    {/* BrowserRouter: lets the app show different pages for different URLs */}
    <BrowserRouter>
      {/* AuthProvider: makes "who is logged in" available everywhere */}
      <AuthProvider>
        <App />
        {/* Toaster: where pop-up notifications (toast.success(...)) appear */}
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
