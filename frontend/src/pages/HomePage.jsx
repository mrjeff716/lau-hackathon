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
    <main className="mx-auto max-w-3xl p-4">
      <header className="mb-4 flex items-center justify-between border-b pb-2">
        <h1 className="text-2xl font-bold">Home Physio Coach</h1>
        <div className="flex items-center gap-3">
          <span>{user.name} ({user.role === 'physio' ? 'Physiotherapist' : 'Patient'})</span>
          <button className="rounded border px-3 py-1" onClick={logout}>Log out</button>
        </div>
      </header>
      {user.role === 'physio' ? <PhysioHome /> : <PatientHome />}
    </main>
  )
}

export default HomePage
