// =============================================================================
// App.jsx — decides which page to show for each URL.
//   /          -> the patient or physio home page (must be logged in)
//   /login     -> log in
//   /register  -> create an account
// =============================================================================

import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth/authContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'

const App = () => {
  const { user, loading } = useAuth()

  // While checking a saved login, show nothing else (avoids a flash of the login page)
  if (loading) return <p className="grid min-h-screen place-items-center text-sm font-medium text-slate-500">Loading…</p>

  return (
    <Routes>
      <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
