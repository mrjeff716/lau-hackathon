// =============================================================================
// RegisterPage.jsx — create an account as a patient or a physiotherapist.
// Physiotherapists automatically get a public ID to share with patients.
// =============================================================================

import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/authContext'

const RegisterPage = () => {
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(form) // App.jsx then sends the user to "/"
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-2xl font-bold">Create an account</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <fieldset className="flex gap-4">
          <legend className="mb-1">I am a:</legend>
          <label className="flex items-center gap-1">
            <input type="radio" name="role" value="patient" checked={form.role === 'patient'} onChange={update('role')} />
            Patient
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="role" value="physio" checked={form.role === 'physio'} onChange={update('role')} />
            Physiotherapist
          </label>
        </fieldset>
        <input className="rounded border px-2 py-1" placeholder="Full name" autoComplete="name"
          value={form.name} onChange={update('name')} required maxLength={100} />
        <input className="rounded border px-2 py-1" type="email" placeholder="Email" autoComplete="email"
          value={form.email} onChange={update('email')} required />
        <input className="rounded border px-2 py-1" type="password" placeholder="Password (8+ characters)"
          autoComplete="new-password" value={form.password} onChange={update('password')}
          required minLength={8} maxLength={72} />
        {error && <p className="text-red-600">{error}</p>}
        <button className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4">Already have an account? <Link className="text-blue-600 underline" to="/login">Log in</Link></p>
    </main>
  )
}

export default RegisterPage
