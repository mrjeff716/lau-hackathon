// =============================================================================
// patient.js — things only a logged-in PATIENT can do.
//   GET    /api/patient/lookup/:publicId  -> find a physio by public ID (shows their name)
//   PUT    /api/patient/physio  { publicId } -> link to that physio
//   DELETE /api/patient/physio             -> unlink from current physio
// The patient's assigned exercises come with GET /api/auth/me.
// =============================================================================

import { Router } from 'express'
import User from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { publicUser } from './auth.js'

const router = Router()
router.use(requireAuth, requireRole('patient'))

const PUBLIC_ID_RE = /^PT-[A-HJ-NP-Z2-9]{6}$/

// Accepts " pt-7k3q9x " and returns "PT-7K3Q9X" (or null if it can't be valid)
function normalizePublicId(value) {
  if (typeof value !== 'string') return null
  const id = value.trim().toUpperCase()
  return PUBLIC_ID_RE.test(id) ? id : null
}

// Step 1: the patient types the ID, and we show who it belongs to, so they
// can confirm it's really their physiotherapist before linking.
router.get('/lookup/:publicId', async (req, res, next) => {
  try {
    const publicId = normalizePublicId(req.params.publicId)
    if (!publicId) return res.status(400).json({ error: 'IDs look like PT-ABC234' })

    const physio = await User.findOne({ publicId, role: 'physio' }, 'name publicId')
    if (!physio) return res.status(404).json({ error: 'No physiotherapist found with that ID' })

    res.json({ physio: { name: physio.name, publicId: physio.publicId } })
  } catch (e) {
    next(e)
  }
})

// Step 2: the patient confirms, and we link them
router.put('/physio', async (req, res, next) => {
  try {
    const publicId = normalizePublicId(req.body?.publicId)
    if (!publicId) return res.status(400).json({ error: 'IDs look like PT-ABC234' })

    const physio = await User.findOne({ publicId, role: 'physio' })
    if (!physio) return res.status(404).json({ error: 'No physiotherapist found with that ID' })

    const patient = req.user
    if (!patient.physio || !patient.physio.equals(physio._id)) {
      // Switching to a new physio: the old physio's exercise plan no longer applies
      patient.physio = physio._id
      patient.exercises = []
      await patient.save()
    }
    res.json({ user: await publicUser(patient) })
  } catch (e) {
    next(e)
  }
})

router.delete('/physio', async (req, res, next) => {
  try {
    const patient = req.user
    patient.physio = null
    patient.exercises = [] // the plan belonged to that physio
    await patient.save()
    res.json({ user: await publicUser(patient) })
  } catch (e) {
    next(e)
  }
})

export default router
