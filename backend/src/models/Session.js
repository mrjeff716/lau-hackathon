// =============================================================================
// Session.js — the shape of one exercise session as stored in MongoDB.
//
// One document = one time a patient did one exercise (e.g. 10 knee bends).
// Privacy: only numbers are stored — no video or images ever leave the
// patient's phone.
// =============================================================================

import mongoose from "mongoose";

// One repetition inside a session
const repSchema = new mongoose.Schema(
  {
    deepestAngle: Number,   // how far the joint bent on this rep (degrees)
    reachedTarget: Boolean, // did it get close enough to the physio's target?
    t: Number,              // when the rep finished (timestamp in ms)
  },
  { _id: false } // reps don't need their own IDs; they live inside a session
);

const sessionSchema = new mongoose.Schema(
  {
    // Which patient. Indexed so "all sessions for patient X" is fast.
    patientId: { type: String, required: true, index: true },
    // Which exercise, matching a key in frontend/src/pose/angles.js EXERCISES
    // (e.g. "rightKneeFlexion")
    exerciseKey: { type: String, required: true },
    reps: [repSchema],  // details of every rep
    totalReps: Number,  // how many reps were done
    goodReps: Number,   // how many reached the target range
    painScore: { type: Number, min: 0, max: 10 }, // optional, ask patient after session
    performedAt: { type: Date, default: Date.now }, // when the session happened
  },
  // Also adds createdAt / updatedAt automatically
  { timestamps: true }
);

// "Session" model -> stored in the "sessions" collection
export default mongoose.model("Session", sessionSchema);
