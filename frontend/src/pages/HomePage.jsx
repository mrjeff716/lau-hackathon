// =============================================================================
// HomePage.jsx — the patient's start screen.
// Shows a "Start exercise" button; once pressed, it shows the ExerciseCoach
// (camera + live feedback). When the patient finishes, it shows a pop-up with
// their score and goes back to the start button.
// =============================================================================

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import ExerciseCoach from '../pose/ExerciseCoach'

// The physio's prescription for this patient. Hard-coded sample for now;
// later this should come from the backend (set by the physio per patient).
const SAMPLE_PLAN = {
  exerciseKey: 'rightKneeFlexion', // which exercise (see pose/angles.js EXERCISES)
  minAngle: 70,   // deepest safe bend (degrees) — going past this triggers a warning
  maxAngle: 170,  // straight position (degrees)
  targetReps: 10, // how many reps to do
}

// TODO: replace with the logged-in patient's real ID
const PATIENT_ID = '[PATIENT_ID]'

const HomePage = () => {
  // false = show the start button, true = show the camera/coach
  const [started, setStarted] = useState(false)

  // Called by ExerciseCoach after the patient presses "Finish session"
  const handleFinish = (summary) => {
    toast.success(`Session saved: ${summary.goodReps}/${summary.totalReps} good reps`)
    setStarted(false)
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Home Physio Coach</h1>
      {started ? (
        <ExerciseCoach plan={SAMPLE_PLAN} patientId={PATIENT_ID} onFinish={handleFinish} />
      ) : (
        <button
          className="rounded bg-green-600 px-4 py-2 text-white"
          onClick={() => setStarted(true)}
        >
          Start exercise
        </button>
      )}
    </main>
  )
}

export default HomePage
