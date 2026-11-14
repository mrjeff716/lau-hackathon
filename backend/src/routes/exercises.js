// =============================================================================
// exercises.js — GET /api/exercises
// Sends the exercise catalog (rehabilitation_exercises_mediapipe.json) so the
// website can list exercises, instructions, and the safety notes.
// =============================================================================

import { Router } from 'express'
import { CATALOG } from '../data/exercises.js'

const router = Router()

router.get('/', (_req, res) => {
  res.json(CATALOG)
})

export default router
