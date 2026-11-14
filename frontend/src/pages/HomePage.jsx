// =============================================================================
// HomePage.jsx — shows the right home page for the logged-in user's role,
// with a small header (name, role, log out).
// =============================================================================

import { useAuth } from '../auth/authContext'
import PatientHome from './PatientHome'
import PhysioHome from './PhysioHome'

const HomePage = () => {
  const { user, logout } = useAuth()

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
      <header className="app-header mb-8 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <h1 className="flex items-center gap-3 text-lg font-bold tracking-tight sm:text-xl">
          <img src="/logo-mark.png" alt="" className="h-9 w-9 drop-shadow-[0_0_10px_rgb(46_230_166/0.45)] sm:h-10 sm:w-10" />
          <span><span className="text-white">Rehab</span><span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">Vision</span></span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-400">{user.name} ({user.role === 'physio' ? 'Physiotherapist' : 'Patient'})</span>
          <button className="btn-secondary" onClick={logout}>Log out</button>
        </div>
      </header>
      {user.role === 'physio' ? <PhysioHome /> : <PatientHome />}
    </main>
  )
}

export default HomePage
