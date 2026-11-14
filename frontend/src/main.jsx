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
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '14px',
              padding: '10px 14px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#e2e8f0',
              background: 'rgb(7 26 21 / 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgb(46 230 166 / 0.25)',
              boxShadow: '0 20px 40px -20px rgb(0 0 0 / 0.9), 0 0 30px -10px rgb(46 230 166 / 0.45)',
            },
            success: { iconTheme: { primary: '#2ee6a6', secondary: '#020a08' } },
            error: { iconTheme: { primary: '#fb7185', secondary: '#020a08' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
