// =============================================================================
// LoginPage.jsx — log in with email and password.
// =============================================================================

import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/authContext'

const LoginPage = () => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault() // don't reload the page
    setError('')
    setBusy(true)
    try {
      await login(email, password) // App.jsx then sends the user to "/"
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-2xl font-bold">Log in</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input className="rounded border px-2 py-1" type="email" placeholder="Email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="rounded border px-2 py-1" type="password" placeholder="Password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-red-600">{error}</p>}
        <button className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-4">No account? <Link className="text-blue-600 underline" to="/register">Create one</Link></p>
    </main>
  )
}

export default LoginPage
