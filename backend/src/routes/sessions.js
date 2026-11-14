// =============================================================================
// sessions.js — the API endpoints for exercise sessions.
// Mounted at /api/sessions in server.js, so:
//   POST /api/sessions        -> save a finished session (patient's phone)
//   GET  /api/sessions/flags  -> list struggling patients (physio dashboard)
// =============================================================================

import { Router } from "express";
import Session from "../models/Session.js";

const router = Router();

// POST /api/sessions
// The patient app sends this when they press "Finish session".
// Body: { patientId, exerciseKey, reps, totalReps, goodReps, performedAt }
router.post("/", async (req, res) => {
  try {
    // Only pick the fields we expect, so nothing extra gets saved
    const { patientId, exerciseKey, reps, totalReps, goodReps, performedAt } = req.body;

    // These two are required to know whose session it is and what exercise
    if (!patientId || !exerciseKey) return res.status(400).json({ error: "missing fields" });

    const s = await Session.create({ patientId, exerciseKey, reps, totalReps, goodReps, performedAt });
    res.status(201).json(s); // 201 = created; send back the saved document
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sessions/flags
// For the physio dashboard: which patients need attention in the last 7 days?
// A patient is flagged if EITHER:
//   - fewer than 50% of their reps reached the target range, OR
//   - they did fewer than 3 sessions (not doing their exercises)
// The worst (lowest quality) patients come first.
router.get("/flags", async (_req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000); // 7 days ago

    // A MongoDB "aggregation pipeline": each step transforms the results of
    // the one before it, like a series of filters.
    const flagged = await Session.aggregate([
      // 1. Keep only sessions from the last 7 days
      { $match: { performedAt: { $gte: since } } },
      // 2. Combine them into one row per patient
      { $group: {
          _id: "$patientId",
          sessions: { $sum: 1 },             // number of sessions
          total: { $sum: "$totalReps" },     // all reps
          good: { $sum: "$goodReps" },       // reps that reached the target
          lastSeen: { $max: "$performedAt" }, // most recent session
      } },
      // 3. quality = good / total (0 if they did no reps, to avoid dividing by 0)
      { $addFields: { quality: { $cond: [{ $gt: ["$total", 0] }, { $divide: ["$good", "$total"] }, 0] } } },
      // 4. Keep only patients who are struggling or not exercising enough
      { $match: { $or: [{ quality: { $lt: 0.5 } }, { sessions: { $lt: 3 } }] } },
      // 5. Lowest quality first
      { $sort: { quality: 1 } },
    ]);
    res.json(flagged);
  } catch (e) {
    // Without this, a database error would leave the request hanging
    res.status(500).json({ error: e.message });
  }
});

export default router;
