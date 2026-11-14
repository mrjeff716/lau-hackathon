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
      <label className="flex items-center gap-3 self-end text-sm font-medium text-slate-600">
        <span>Coach language:</span>
        <select value={lang} onChange={changeLang} className="field-sm w-auto">
          {Object.entries(LANGUAGES).map(([code, l]) => (
            <option key={code} value={code}>{l.name}</option>
          ))}
        </select>
      </label>

      {error && <p className="alert-error">{error}</p>}

      {/* --- Physiotherapist --- */}
      <section className="card p-5 sm:p-6">
        <h2 className="section-title">My physiotherapist</h2>
        {user.physio ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-3">
            <span className="font-semibold text-brand-900">{user.physio.name} <code className="ms-1 text-sm font-medium text-brand-700">({user.physio.publicId})</code></span>
            <button className="btn-danger" onClick={unlinkPhysio}>Remove</button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-600">Ask your physiotherapist for their ID (it looks like PT-ABC234).</p>
            <form onSubmit={findPhysio} className="flex gap-2">
              <input className="field max-w-xs font-mono uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal" placeholder="PT-XXXXXX" value={lookupId}
                onChange={(e) => setLookupId(e.target.value)} required />
              <button className="btn-primary" disabled={busy}>Find</button>
            </form>
            {found && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm">
                <span className="me-auto text-slate-700">Is this your physiotherapist? <b>{found.name}</b> ({found.publicId})</span>
                <button className="btn-primary" onClick={linkPhysio} disabled={busy}>
                  Yes, add
                </button>
                <button className="btn-secondary" onClick={() => setFound(null)}>No</button>
              </div>
            )}
          </>
        )}
      </section>

      {/* --- Exercises --- */}
      <section>
        <h2 className="section-title px-1">My exercises</h2>
        {!user.physio ? (
          <p className="card border-dashed px-5 py-8 text-center text-sm text-slate-500 shadow-none">Add your physiotherapist first. They will choose your exercises.</p>
        ) : exercises.length === 0 ? (
          <p className="card border-dashed px-5 py-8 text-center text-sm text-slate-500 shadow-none">Your physiotherapist hasn't assigned exercises yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {exercises.map((a) => {
              const info = catalogById[a.exerciseId]
              return (
                <li key={a._id} className="card flex flex-col gap-2 p-5 transition hover:shadow-lift sm:p-6">
                  <div className="text-lg font-bold text-slate-900">
                    {t.exercises[a.exerciseId] ?? a.exerciseId} · {t.ui[a.side]}
                  </div>
                  <div className="text-sm font-medium text-slate-600">{a.reps} reps · from {a.startAngle}° to {a.targetAngle}°</div>
                  <div className="rounded-lg border-s-4 border-red-400 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">Stop if: {a.stopCriteria}</div>
                  {info && (
                    <details className="mt-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 [&[open]>summary]:mb-2 [&>p]:leading-relaxed">
                      <summary>How to do it</summary>
                      <p>{info.setup}</p>
                      <ul className="my-2 list-disc space-y-1 ps-5 marker:text-brand-500">
                        {info.ideal_form.map((line) => <li key={line}>{line}</li>)}
                      </ul>
                      <p className="text-xs font-medium text-slate-500">Camera: {info.measurement.preferred_camera_view}</p>
                    </details>
                  )}
                  <button className="btn-primary btn-lg mt-2 self-start" onClick={() => setActive(a)}>
                    Start
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {catalog?.safety_note && <p className="px-1 text-xs leading-relaxed text-slate-500">{catalog.safety_note}</p>}
    </div>
  )
}

export default PatientHome
