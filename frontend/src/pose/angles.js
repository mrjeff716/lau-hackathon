// =============================================================================
// angles.js — the maths behind the coach. No React here, just plain functions:
//   - which body points each exercise uses (MediaPipe landmark IDs)
//   - how to turn those points into a clinical angle (0° = neutral)
//   - how to smooth jittery readings
//   - how to count reps (leniently) and judge them against the physio's target
//
// Exercise IDs match backend/src/data/rehabilitation_exercises_mediapipe.json.
// =============================================================================

// MediaPipe Pose Landmarker finds 33 points on the body, numbered 0–32.
// These are the ones we use (official IDs from Google's documentation).
export const LM = {
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13,    R_ELBOW: 14,
  L_WRIST: 15,    R_WRIST: 16,
  L_HIP: 23,      R_HIP: 24,
  L_KNEE: 25,     R_KNEE: 26,
  L_ANKLE: 27,    R_ANKLE: 28,
};

// Geometric angle at point b (in degrees) formed by a-b-c, using 3D world
// landmarks (meters). Example: hip-knee-ankle gives ~180° for a straight leg.
// World landmarks are better than normalized ones for angles: no image
// aspect-ratio distortion.
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

// Clinical flexion = 180° − geometric angle, so a straight joint is 0°
// (the convention used in the exercise catalog for knee and elbow).
export function flexionAngle(a, b, c) {
  const g = jointAngle(a, b, c);
  return g == null ? null : 180 - g;
}

// Hip abduction: how far the thigh (hip -> knee) moves out sideways from its
// neutral "straight down" direction, in the frontal plane (x, y only).
// "Straight down" is measured perpendicular to the line between the two hips,
// so a tilted pelvis doesn't fake abduction. The shoulder tells us which way
// is "down" (away from the trunk). Moving the leg inwards (across the body)
// returns 0.
// Note: this is an estimate, not clinically isolated hip-joint motion.
export function hipAbductionAngle(shoulder, hip, knee, otherHip) {
  // Pelvis line, pointing outwards towards the exercising side
  const pel = { x: hip.x - otherHip.x, y: hip.y - otherHip.y };
  if (Math.hypot(pel.x, pel.y) === 0) return null;

  // Perpendicular to the pelvis line, flipped if needed so it points away
  // from the shoulder (i.e. down the leg)
  let down = { x: -pel.y, y: pel.x };
  const trunkDown = { x: hip.x - shoulder.x, y: hip.y - shoulder.y };
  if (down.x * trunkDown.x + down.y * trunkDown.y < 0) down = { x: -down.x, y: -down.y };

  const thigh = { x: knee.x - hip.x, y: knee.y - hip.y };
  if (Math.hypot(thigh.x, thigh.y) === 0) return null;

  // Leg moving inwards = adduction, not abduction
  if (thigh.x * pel.x + thigh.y * pel.y < 0) return 0;

  const cross = down.x * thigh.y - down.y * thigh.x;
  const dot = down.x * thigh.x + down.y * thigh.y;
  return (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI;
}

// The six exercises from the catalog. For each side: which landmark IDs to
// use, and how to turn them into the clinical angle.
export const EXERCISES = {
  supine_heel_slide: {
    // knee flexion: hip -> knee -> ankle
    landmarks: { left: [23, 25, 27], right: [24, 26, 28] },
    measure: ([hip, knee, ankle]) => flexionAngle(hip, knee, ankle),
  },
  seated_knee_extension: {
    // same knee measurement; the movement goes the other way (bent -> straight)
    landmarks: { left: [23, 25, 27], right: [24, 26, 28] },
    measure: ([hip, knee, ankle]) => flexionAngle(hip, knee, ankle),
  },
  standing_shoulder_forward_flexion: {
    // angle at the shoulder between shoulder->hip and shoulder->elbow:
    // 0° arm at side, ~90° arm in front, ~180° overhead
    landmarks: { left: [23, 11, 13], right: [24, 12, 14] },
    measure: ([hip, shoulder, elbow]) => jointAngle(hip, shoulder, elbow),
  },
  seated_elbow_flexion: {
    // elbow flexion: shoulder -> elbow -> wrist
    landmarks: { left: [11, 13, 15], right: [12, 14, 16] },
    measure: ([shoulder, elbow, wrist]) => flexionAngle(shoulder, elbow, wrist),
  },
  standing_bicep_curl: {
    // bicep curl = elbow flexion with a weight: same shoulder -> elbow -> wrist
    // measurement (the app tracks the angle only, not the weight)
    landmarks: { left: [11, 13, 15], right: [12, 14, 16] },
    measure: ([shoulder, elbow, wrist]) => flexionAngle(shoulder, elbow, wrist),
  },
  standing_hip_abduction: {
    // shoulder, hip, knee on the exercising side + the other hip (pelvis reference)
    landmarks: { left: [11, 23, 25, 24], right: [12, 24, 26, 23] },
    measure: ([shoulder, hip, knee, otherHip]) => hipAbductionAngle(shoulder, hip, knee, otherHip),
  },
};

// Landmark IDs an exercise needs on a given side (or null if unknown)
export function landmarksFor(exerciseId, side) {
  return EXERCISES[exerciseId]?.landmarks[side] ?? null;
}

// Measures the clinical angle for an exercise from MediaPipe world landmarks
export function measureAngle(exerciseId, side, world) {
  const ex = EXERCISES[exerciseId];
  const ids = ex?.landmarks[side];
  if (!ids) return null;
  const points = ids.map((i) => world[i]);
  if (points.some((p) => !p)) return null;
  return ex.measure(points);
}

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

// ---- Rep counting -----------------------------------------------------------
// Everything is measured as "progress" from the start angle (0) to the
// physio's target angle (1). This works for every exercise, whether the angle
// goes up (heel slide, arm raise) or down (seated knee extension).
//
// Lenient on purpose, for patients in rehab:
//   - a rep STARTS once they get 40% of the way to the target
//   - it COUNTS once they come back to within 20% of the start
//     (they don't need to return all the way)
//   - it's a GOOD rep if it got 80% of the way to the target
// The gap between 40% and 20% stops small wobbles from counting twice.
export const REP_START_PROGRESS = 0.4;
export const REP_RETURN_PROGRESS = 0.2;
export const REACHED_TARGET_PROGRESS = 0.8;

// Returns a function: call it with each angle; it reports the rep count and,
// when a rep has just finished, `completed` with the furthest angle reached.
export function makeRepCounter({ start, target }) {
  const range = target - start;
  let phase = "rest";        // "rest" (near start) or "active" (doing a rep)
  let reps = 0;
  let peakProgress = 0;      // furthest progress in the current rep
  let peakAngle = null;      // the angle at that point

  return (angle) => {
    let completed = null;
    if (angle == null || range === 0) return { reps, phase, completed };
    const progress = (angle - start) / range;

    if (phase === "rest") {
      if (progress >= REP_START_PROGRESS) {        // started moving towards the target
        phase = "active";
        peakProgress = progress;
        peakAngle = angle;
      }
    } else {
      if (progress > peakProgress) {               // new furthest point
        peakProgress = progress;
        peakAngle = angle;
      }
      if (progress <= REP_RETURN_PROGRESS) {       // came back: one rep done
        phase = "rest";
        reps += 1;
        completed = {
          peakAngle: Math.round(peakAngle),
          peakProgress,
          reachedTarget: peakProgress >= REACHED_TARGET_PROGRESS,
        };
      }
    }
    return { reps, phase, completed };
  };
}

// Safety: is the angle outside the physio's permitted range?
// A 5° margin avoids false alarms from measurement noise.
export const SAFETY_MARGIN_DEG = 5;
export function outsideSafeRange(angle, { permittedMin, permittedMax }) {
  return angle < permittedMin - SAFETY_MARGIN_DEG || angle > permittedMax + SAFETY_MARGIN_DEG;
}
