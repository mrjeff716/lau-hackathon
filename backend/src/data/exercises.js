// =============================================================================
// exercises.js — loads the exercise catalog (rehabilitation_exercises_mediapipe.json)
// and gives the rest of the backend simple helpers to use it.
//
// The JSON file is the single source of truth for which exercises exist.
// The frontend gets the same data from GET /api/exercises.
// =============================================================================

import { readFileSync } from 'node:fs'

const raw = readFileSync(
  new URL('./rehabilitation_exercises_mediapipe.json', import.meta.url),
  'utf8',
)

// The whole file (title, safety notes, exercises, sources)
export const CATALOG = JSON.parse(raw)

// Quick lookup: exercise id -> exercise definition
export const EXERCISES_BY_ID = Object.fromEntries(
  CATALOG.exercises.map((ex) => [ex.id, ex]),
)

export const SIDES = ['left', 'right']

// A physiotherapist can assign at most this many exercises to one patient
export const MAX_EXERCISES_PER_PATIENT = 3

export function isValidExerciseId(id) {
  return typeof id === 'string' && Object.hasOwn(EXERCISES_BY_ID, id)
}
