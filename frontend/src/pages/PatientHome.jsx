// =============================================================================
// PatientHome.jsx — the patient's home page.
//   1. Link to a physiotherapist: type their public ID, check the name that
//      comes back, then confirm.
//   2. See the (up to 3) exercises the physio assigned, and start one.
//   3. When an exercise is finished, save the results (or keep them on the
//      device if offline, and send them next time).
// =============================================================================

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../auth/authContext'
import { api, saveSession, flushPendingSessions } from '../api'
import ExerciseCoach from '../pose/ExerciseCoach'
import { LANGUAGES, getStrings, loadLang, saveLang } from '../i18n/messages'

const PatientHome = () => {
  const { user, setUser, refresh, logout } = useAuth()
  const [lang, setLang] = useState(loadLang)
  const [catalog, setCatalog] = useState(null) // exercise instructions
  const [active, setActive] = useState(null)   // the exercise being done now
  const [lookupId, setLookupId] = useState('')
  const [found, setFound] = useState(null)     // physio found by public ID, not yet linked
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const t = getStrings(lang)

  // Expired login -> back to the login page; anything else -> show the message
  const handleError = (e) => (e.status === 401 ? logout() : setError(e.message))

  // When the page opens: reload the plan (the physio may have changed it),
  // load exercise instructions, and send any sessions saved while offline.
  useEffect(() => {
    refresh().catch((e) => { if (e.status === 401) logout() })
    api('/exercises').then(setCatalog).catch(() => {})
    flushPendingSessions(user._id).then((n) => {
      if (n) toast.success(`${n} session(s) saved earlier were sent to your physiotherapist`)
    })
  }, [user._id, refresh, logout])

  const changeLang = (e) => {
    setLang(e.target.value)
    saveLang(e.target.value)
  }

  // Step 1 of linking: find the physio and show their name
  const findPhysio = async (e) => {
    e.preventDefault()
    setError('')
    setFound(null)
    setBusy(true)
    try {
      const data = await api(`/patient/lookup/${encodeURIComponent(lookupId.trim())}`)
      setFound(data.physio)
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  // Step 2 of linking: the patient confirmed it's the right person
  const linkPhysio = async () => {
    setError('')
    setBusy(true)
    try {
      const data = await api('/patient/physio', { method: 'PUT', body: { publicId: found.publicId } })
      setUser(data.user)
      setFound(null)
      setLookupId('')
      toast.success(`${data.user.physio.name} is now your physiotherapist`)
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  const unlinkPhysio = async () => {
    if (!window.confirm('Remove this physiotherapist? Your assigned exercises will be cleared.')) return
    setError('')
    try {
      const data = await api('/patient/physio', { method: 'DELETE' })
      setUser(data.user)
    } catch (err) {
      handleError(err)
    }
  }

  // Called by ExerciseCoach when the patient presses "Finish session"
  const handleFinish = async (summary) => {
    setActive(null)
    const good = summary.reps.filter((r) => r.reachedTarget).length
    try {
      const savedNow = await saveSession(user._id, summary)
      if (savedNow) toast.success(t.ui.saved(good, summary.reps.length))
      else toast('No connection: the session is kept on this device and will be sent later.')
    } catch (err) {
      toast.error(`Could not save the session: ${err.message}`)
    }
  }

  // Doing an exercise: show only the coach
  if (active) {
    return (
      <ExerciseCoach
        key={active._id}
        assignment={active}
        lang={lang}
        onFinish={handleFinish}
        onCancel={() => setActive(null)}
      />
    )
  }

  const exercises = user.exercises ?? []
  const catalogById = Object.fromEntries((catalog?.exercises ?? []).map((ex) => [ex.id, ex]))

  return (
    <div className="flex flex-col gap-6">
      {/* Language for the exercise coach (spoken + on-screen feedback) */}
      <label className="flex items-center gap-2">
        <span>Coach language:</span>
        <select value={lang} onChange={changeLang} className="rounded border px-2 py-1">
          {Object.entries(LANGUAGES).map(([code, l]) => (
            <option key={code} value={code}>{l.name}</option>
          ))}
        </select>
      </label>

      {error && <p className="text-red-600">{error}</p>}

      {/* --- Physiotherapist --- */}
      <section>
        <h2 className="mb-2 text-xl font-semibold">My physiotherapist</h2>
        {user.physio ? (
          <div className="flex items-center gap-3">
            <span>{user.physio.name} <code>({user.physio.publicId})</code></span>
            <button className="rounded border px-3 py-1" onClick={unlinkPhysio}>Remove</button>
          </div>
        ) : (
          <>
            <p className="mb-2">Ask your physiotherapist for their ID (it looks like PT-ABC234).</p>
            <form onSubmit={findPhysio} className="flex gap-2">
              <input className="rounded border px-2 py-1" placeholder="PT-XXXXXX" value={lookupId}
                onChange={(e) => setLookupId(e.target.value)} required />
              <button className="rounded border px-3 py-1" disabled={busy}>Find</button>
            </form>
            {found && (
              <div className="mt-2 flex items-center gap-3">
                <span>Is this your physiotherapist? <b>{found.name}</b> ({found.publicId})</span>
                <button className="rounded bg-green-600 px-3 py-1 text-white" onClick={linkPhysio} disabled={busy}>
                  Yes, add
                </button>
                <button className="rounded border px-3 py-1" onClick={() => setFound(null)}>No</button>
              </div>
            )}
          </>
        )}
      </section>

      {/* --- Exercises --- */}
      <section>
        <h2 className="mb-2 text-xl font-semibold">My exercises</h2>
        {!user.physio ? (
          <p>Add your physiotherapist first. They will choose your exercises.</p>
        ) : exercises.length === 0 ? (
          <p>Your physiotherapist hasn't assigned exercises yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {exercises.map((a) => {
              const info = catalogById[a.exerciseId]
              return (
                <li key={a._id} className="rounded border p-3">
                  <div className="font-semibold">
                    {t.exercises[a.exerciseId] ?? a.exerciseId} · {t.ui[a.side]}
                  </div>
                  <div>{a.reps} reps · from {a.startAngle}° to {a.targetAngle}°</div>
                  <div className="text-red-700">Stop if: {a.stopCriteria}</div>
                  {info && (
                    <details className="mt-1">
                      <summary>How to do it</summary>
                      <p>{info.setup}</p>
                      <ul className="list-disc pl-5">
                        {info.ideal_form.map((line) => <li key={line}>{line}</li>)}
                      </ul>
                      <p className="text-sm">Camera: {info.measurement.preferred_camera_view}</p>
                    </details>
                  )}
                  <button className="mt-2 rounded bg-green-600 px-4 py-2 text-white" onClick={() => setActive(a)}>
                    Start
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {catalog?.safety_note && <p className="text-sm text-gray-600">{catalog.safety_note}</p>}
    </div>
  )
}

export default PatientHome
