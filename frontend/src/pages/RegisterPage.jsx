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
    <main className="auth-card">
      <h1 className="mb-7 text-3xl font-semibold">Create an account</h1>
      <form onSubmit={submit} onInvalidCapture={(e) => { e.preventDefault(); e.currentTarget.querySelector(':invalid')?.focus() }} className="stagger flex flex-col gap-3.5">
        {/* invalid fields show the styled hints below instead of the browser's popup */}
        <fieldset className="mb-1 grid grid-cols-2 gap-2">
          <legend className="field-label mb-2">I am a:</legend>
          <label className="flex min-w-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-void-800/70 px-2 py-3 text-center text-sm font-semibold text-slate-300 shadow-card transition duration-300 hover:border-white/20 hover:text-white has-[:checked]:border-brand-400/60 has-[:checked]:bg-brand-400/10 has-[:checked]:text-brand-200 has-[:checked]:shadow-glow has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400/70">
            <input className="sr-only" type="radio" name="role" value="patient" checked={form.role === 'patient'} onChange={update('role')} />
            Patient
          </label>
          <label className="flex min-w-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-void-800/70 px-2 py-3 text-center text-sm font-semibold text-slate-300 shadow-card transition duration-300 hover:border-white/20 hover:text-white has-[:checked]:border-brand-400/60 has-[:checked]:bg-brand-400/10 has-[:checked]:text-brand-200 has-[:checked]:shadow-glow has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400/70">
            <input className="sr-only" type="radio" name="role" value="physio" checked={form.role === 'physio'} onChange={update('role')} />
            Physiotherapist
          </label>
        </fieldset>
        <input className="field" placeholder="Full name" autoComplete="name"
          value={form.name} onChange={update('name')} required maxLength={100} />
        <p className="field-hint hint-empty">Please tell us your full name.</p>
        <input className="field" type="email" placeholder="Email" autoComplete="email"
          value={form.email} onChange={update('email')} required />
        <p className="field-hint hint-empty">We need your email to create your account.</p>
        <p className="field-hint hint-format">That email looks incomplete. Try something like name@example.com.</p>
        <input className="field" type="password" placeholder="Password (8+ characters)"
          autoComplete="new-password" value={form.password} onChange={update('password')}
          required minLength={8} maxLength={72} />
        <p className="field-hint hint-empty">Choose a password to protect your account.</p>
        <p className="field-hint hint-format">Almost there. Your password needs at least 8 characters.</p>
        {error && <p className="alert-error">{error}</p>}
        <button className="btn-primary btn-lg mt-2 w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">Already have an account? <Link className="link" to="/login">Log in</Link></p>
    </main>
  )
}

export default RegisterPage
