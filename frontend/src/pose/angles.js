// =============================================================================
// angles.js — the maths behind the coach. No React here, just plain functions:
//   - which body points to use for each exercise
//   - how to turn 3 points into a joint angle
//   - how to smooth jittery readings
//   - how to count reps
// =============================================================================

// MediaPipe Pose Landmarker finds 33 points on the body, numbered 0–32.
// These are the ones we use (e.g. landmark 26 = right knee).
export const LM = {
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13,    R_ELBOW: 14,
  L_WRIST: 15,    R_WRIST: 16,
  L_HIP: 23,      R_HIP: 24,
  L_KNEE: 25,     R_KNEE: 26,
  L_ANKLE: 27,    R_ANKLE: 28,
};

// Angle at point b (in degrees) formed by a-b-c, using 3D world landmarks (meters).
// Example: hip-knee-ankle gives the knee angle (~180° straight, smaller when bent).
// World landmarks are better than normalized ones for angles: no image aspect-ratio distortion.
export function jointAngle(a, b, c) {
  // Two arrows pointing out from the joint: b->a and b->c
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  // Angle between two arrows: cos(angle) = (v1 · v2) / (|v1| * |v2|)
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const m1 = Math.hypot(v1.x, v1.y, v1.z); // length of v1
  const m2 = Math.hypot(v2.x, v2.y, v2.z); // length of v2
  if (m1 === 0 || m2 === 0) return null;   // points on top of each other: no angle
  // Clamp to [-1, 1] so tiny rounding errors can't break Math.acos
  const cos = Math.min(1, Math.max(-1, dot / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI; // radians -> degrees
}

// Exercise definitions: which three landmarks make the joint we care about.
// The middle point is the joint being measured.
// The physio sets minAngle / maxAngle per patient (the "safe range").
// To add an exercise, add an entry here and use its key in the plan.
export const EXERCISES = {
  rightKneeFlexion: {
    label: "Right knee bend",
    points: [LM.R_HIP, LM.R_KNEE, LM.R_ANKLE],
  },
  leftKneeFlexion: {
    label: "Left knee bend",
    points: [LM.L_HIP, LM.L_KNEE, LM.L_ANKLE],
  },
  rightElbowFlexion: {
    label: "Right elbow bend",
    points: [LM.R_SHOULDER, LM.R_ELBOW, LM.R_WRIST],
  },
  rightShoulderAbduction: {
    label: "Right arm raise (side)",
    points: [LM.R_HIP, LM.R_SHOULDER, LM.R_ELBOW],
  },
};

// Only trust a frame if all needed landmarks are actually visible.
// MediaPipe gives each point a "visibility" score from 0 to 1; if the knee is
// out of the camera's view, its score is low and the angle would be a guess.
export function visibleEnough(landmarks, idxs, threshold = 0.6) {
  return idxs.every((i) => (landmarks[i]?.visibility ?? 0) >= threshold);
}

// Smooths jittery angles (exponential moving average).
// Each new reading only moves the result `alpha` (30%) of the way towards it,
// so one noisy frame can't make the number jump around.
// Returns a function: call it with each new angle, get back the smoothed angle.
export function makeSmoother(alpha = 0.3) {
  let prev = null; // last smoothed value (remembered between calls)
  return (v) => {
    if (v == null) return prev; // no reading this frame: keep the last value
    prev = prev == null ? v : alpha * v + (1 - alpha) * prev;
    return prev;
  };
}

// Rep counter with hysteresis: a rep = go past `bentAt`, then come back past `straightAt`.
// Using two different thresholds (hysteresis) stops small wobbles around one
// line from counting as many reps.
// Returns a function: call it with each angle; it reports the rep count and,
// when a rep has just finished, `completed` with the deepest angle of that rep.
export function makeRepCounter({ bentAt, straightAt }) {
  let phase = "straight"; // are we currently bent or straight?
  let reps = 0;
  let minSeen = 180;      // deepest (smallest) angle during the current rep
  return (angle) => {
    let completed = null;
    if (angle == null) return { reps, phase, completed };
    minSeen = Math.min(minSeen, angle);
    if (phase === "straight" && angle < bentAt) phase = "bent"; // started bending
    else if (phase === "bent" && angle > straightAt) {           // came back up: 1 rep
      phase = "straight";
      reps += 1;
      completed = { deepestAngle: Math.round(minSeen) };
      minSeen = 180; // reset for the next rep
    }
    return { reps, phase, completed };
  };
}
