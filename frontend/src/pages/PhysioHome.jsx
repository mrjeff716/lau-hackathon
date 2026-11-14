// =============================================================================
// PhysioHome.jsx — the physiotherapist's home page.
//   - Shows their public ID to give to patients
//   - Lists linked patients; for each: choose up to 3 exercises (with side,
//     angles, reps, stop criteria, clinical clearance), see sessions, remove
//   - Lists patients who need attention this week ("flags")
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../auth/authContext'
import { api } from '../api'

const MAX_EXERCISES = 3

const PhysioHome = () => {
  const { user, logout } = useAuth()
  const [catalog, setCatalog] = useState(null)
  const [patients, setPatients] = useState([])
  const [flags, setFlags] = useState([])
  const [error, setError] = useState('')

  // Expired login -> back to the login page; anything else -> show the message
  const handleError = useCallback((e) => (e.status === 401 ? logout() : setError(e.message)), [logout])

  const load = useCallback(async () => {
    setError('')
    try {
      const [c, p, f] = await Promise.all([
        api('/exercises'),
        api('/physio/patients'),
        api('/physio/flags'),
      ])
      setCatalog(c)
      setPatients(p.patients)
      setFlags(f.flagged)
    } catch (e) {
      handleError(e)
    }
  }, [handleError])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p>
          Your public ID: <code className="rounded bg-gray-100 px-2 py-1 text-lg">{user.publicId}</code>
        </p>
        <p className="text-sm">Give this ID to your patients so they can add you.</p>
      </section>

      {error && <p className="text-red-600">{error}</p>}

      <section>
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-xl font-semibold">My patients</h2>
          <button className="rounded border px-3 py-1" onClick={load}>Refresh</button>
        </div>
        {patients.length === 0 ? (
          <p>No patients yet. They will appear here after they add your ID.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {patients.map((p) => (
              <PatientCard key={p._id} patient={p} catalog={catalog} onChanged={load} onError={handleError} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Needs attention (last 7 days)</h2>
        {flags.length === 0 ? (
          <p>No patients flagged.</p>
        ) : (
          <ul className="list-disc pl-5">
            {flags.map((f) => (
              <li key={f.patientId}>
                <b>{f.name}</b>: {f.reasons.join('; ')}
                {f.lastSeen && ` (last session ${new Date(f.lastSeen).toLocaleDateString()})`}
              </li>
            ))}
          </ul>
        )}
      </section>

      {catalog && (
        <section className="text-sm text-gray-600">
          <p><b>Safety:</b> {catalog.safety_note}</p>
          <p className="mt-1"><b>Measurement:</b> {catalog.measurement_note}</p>
        </section>
      )}
    </div>
  )
}

// One patient: their current exercises, plus buttons to edit / see sessions / remove
function PatientCard({ patient, catalog, onChanged, onError }) {
  const [editing, setEditing] = useState(false)
  const [sessions, setSessions] = useState(null) // null = not loaded/hidden

  const nameOf = (id) => catalog?.exercises.find((ex) => ex.id === id)?.name ?? id

  const toggleSessions = async () => {
    if (sessions) return setSessions(null)
    try {
      const data = await api(`/physio/patients/${patient._id}/sessions`)
      setSessions(data.sessions)
    } catch (e) {
      onError(e)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Remove ${patient.name} from your patients? Their exercises will be cleared.`)) return
    try {
      await api(`/physio/patients/${patient._id}`, { method: 'DELETE' })
      onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const exercises = patient.exercises ?? []

  return (
    <li className="rounded border p-3">
      <div className="font-semibold">{patient.name} <span className="font-normal">({patient.email})</span></div>
      {exercises.length === 0 ? (
        <p>No exercises assigned.</p>
      ) : (
        <ul className="list-disc pl-5">
          {exercises.map((a) => (
            <li key={a._id}>
              {nameOf(a.exerciseId)} ({a.side}): {a.reps} reps, {a.startAngle}° → {a.targetAngle}°,
              safe range {a.permittedMin}°–{a.permittedMax}°
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex gap-2">
        <button className="rounded border px-3 py-1" onClick={() => setEditing(!editing)} disabled={!catalog}>
          {editing ? 'Close editor' : 'Edit exercises'}
        </button>
        <button className="rounded border px-3 py-1" onClick={toggleSessions}>
          {sessions ? 'Hide sessions' : 'Sessions'}
        </button>
        <button className="rounded border px-3 py-1 text-red-700" onClick={remove}>Remove patient</button>
      </div>

      {editing && catalog && (
        <AssignmentEditor
          patient={patient}
          catalog={catalog}
          onSaved={() => { setEditing(false); onChanged() }}
          onError={onError}
        />
      )}

      {sessions && (
        sessions.length === 0 ? <p className="mt-2">No sessions yet.</p> : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left"><th>Date</th><th>Exercise</th><th>Side</th><th>Good / total reps</th><th>Target</th></tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s._id}>
                  <td>{new Date(s.performedAt).toLocaleString()}</td>
                  <td>{nameOf(s.exerciseId)}</td>
                  <td>{s.side}</td>
                  <td>{s.goodReps} / {s.totalReps}</td>
                  <td>{s.plan?.targetAngle}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </li>
  )
}

// Default values for a newly chosen exercise, from the catalog's reference
// motion. These are anatomical references, NOT a prescription — the physio
// must adjust them for the patient.
function defaultsFor(catalog, exerciseId) {
  const ex = catalog.exercises.find((e) => e.id === exerciseId)
  const { start, end } = ex.illustrative_motion_deg
  return {
    exerciseId,
    startAngle: String(start),
    targetAngle: String(end),
    permittedMin: String(Math.min(start, end)),
    permittedMax: String(Math.max(start, end)),
  }
}

// Form fields are strings while editing; '' must not silently become 0
const toNumber = (v) => (String(v).trim() === '' ? NaN : Number(v))

// Edit a patient's exercise list (max 3). The server checks every value again.
function AssignmentEditor({ patient, catalog, onSaved, onError }) {
  const [rows, setRows] = useState(() =>
    (patient.exercises ?? []).map((a) => ({
      exerciseId: a.exerciseId,
      side: a.side,
      startAngle: String(a.startAngle),
      targetAngle: String(a.targetAngle),
      permittedMin: String(a.permittedMin),
      permittedMax: String(a.permittedMax),
      reps: String(a.reps),
      stopCriteria: a.stopCriteria,
      clinicalClearance: a.clinicalClearance,
    })),
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const updateRow = (i, changes) => setRows(rows.map((r, j) => (j === i ? { ...r, ...changes } : r)))

  const addRow = () => setRows([
    ...rows,
    { ...defaultsFor(catalog, catalog.exercises[0].id), side: 'right', reps: '10', stopCriteria: '', clinicalClearance: false },
  ])

  const save = async () => {
    setError('')
    setBusy(true)
    try {
      const exercises = rows.map((r) => ({
        exerciseId: r.exerciseId,
        side: r.side,
        startAngle: toNumber(r.startAngle),
        targetAngle: toNumber(r.targetAngle),
        permittedMin: toNumber(r.permittedMin),
        permittedMax: toNumber(r.permittedMax),
        reps: toNumber(r.reps),
        stopCriteria: r.stopCriteria,
        clinicalClearance: r.clinicalClearance,
      }))
      await api(`/physio/patients/${patient._id}/exercises`, { method: 'PUT', body: { exercises } })
      toast.success(`Exercises saved for ${patient.name}`)
      onSaved()
    } catch (e) {
      if (e.status === 401) onError(e)
      else setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const numberField = (i, field, label) => (
    <label className="flex flex-col text-sm">
      {label}
      <input className="w-20 rounded border px-1" type="number" min="0" max="180"
        value={rows[i][field]} onChange={(e) => updateRow(i, { [field]: e.target.value })} />
    </label>
  )

  return (
    <div className="mt-3 rounded bg-gray-50 p-3">
      <p className="mb-2 text-sm">
        Angles in degrees, 0° = neutral (e.g. straight knee). Defaults are healthy reference values,
        not a prescription — set them for this patient. Max {MAX_EXERCISES} exercises.
      </p>
      {rows.map((r, i) => (
        <div key={i} className="mb-3 flex flex-col gap-2 border-b pb-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-sm">
              Exercise
              <select className="rounded border px-1" value={r.exerciseId}
                onChange={(e) => updateRow(i, defaultsFor(catalog, e.target.value))}>
                {catalog.exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              Side
              <select className="rounded border px-1" value={r.side} onChange={(e) => updateRow(i, { side: e.target.value })}>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
            {numberField(i, 'startAngle', 'Start °')}
            {numberField(i, 'targetAngle', 'Target °')}
            {numberField(i, 'permittedMin', 'Safe min °')}
            {numberField(i, 'permittedMax', 'Safe max °')}
            <label className="flex flex-col text-sm">
              Reps
              <input className="w-16 rounded border px-1" type="number" min="1" max="100"
                value={r.reps} onChange={(e) => updateRow(i, { reps: e.target.value })} />
            </label>
            <button className="rounded border px-2 py-1 text-sm text-red-700"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</button>
          </div>
          <label className="flex flex-col text-sm">
            Stop if (pain / symptoms)
            <input className="rounded border px-1" maxLength={500} value={r.stopCriteria}
              placeholder="e.g. sharp pain, swelling, pain above 5/10"
              onChange={(e) => updateRow(i, { stopCriteria: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={r.clinicalClearance}
              onChange={(e) => updateRow(i, { clinicalClearance: e.target.checked })} />
            I confirm this patient is clinically cleared for this exercise and range
          </label>
        </div>
      ))}
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button className="rounded border px-3 py-1" onClick={addRow} disabled={rows.length >= MAX_EXERCISES}>
          Add exercise
        </button>
        <button className="rounded bg-green-600 px-3 py-1 text-white disabled:opacity-50" onClick={save} disabled={busy}>
          Save
        </button>
      </div>
    </div>
  )
}

export default PhysioHome
