// =============================================================================
// ExerciseCoach.jsx — the main exercise screen.
//
// What it does, many times per second:
//   1. Shows the front camera (mirrored, like a mirror)
//   2. Asks the pose model where the patient's body points are
//   3. Draws the skeleton on top of the video
//   4. Measures the joint angle for this exercise (e.g. the knee)
//   5. Warns (on screen + out loud in Arabic) if they go past the safe range
//   6. Counts reps and says whether each one was good
// When the patient presses "Finish session", it sends ONLY the numbers to the
// backend — never the video.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
import { usePoseLandmarker } from "./usePoseLandmarker";
import {
  EXERCISES, jointAngle, visibleEnough, makeSmoother, makeRepCounter,
} from "./angles";

// Spoken feedback using the browser's built-in text-to-speech
// (works for patients with eye injuries too, and they don't need to look at the screen).
// "ar-LB" may not exist on every phone; the browser falls back to another Arabic/default voice.
function speak(text, lang = "ar-LB") {
  if (!("speechSynthesis" in window)) return; // browser doesn't support speech
  window.speechSynthesis.cancel();            // stop any message still playing
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  window.speechSynthesis.speak(u);
}

// What the coach says, in Lebanese Arabic
const MESSAGES = {
  tooFar: "شوي بعد، ما تزيد عن الحد",        // "a bit less, don't go past the limit"
  notEnough: "انزل شوي كمان",               // "go down a little more"
  good: "ممتاز",                              // "excellent"
  notVisible: "رجاع لورا، لازم شوفك كلك",   // "step back, I need to see all of you"
};

/**
 * plan = the physio's prescription for this patient, e.g.
 * { exerciseKey: "rightKneeFlexion", minAngle: 70, maxAngle: 170, targetReps: 10 }
 * minAngle = deepest safe bend, maxAngle = straight position.
 * patientId = who is exercising (saved with the results)
 * onFinish(summary) = called after "Finish session" is pressed
 */
export default function ExerciseCoach({ plan, patientId, onFinish }) {
  const videoRef = useRef(null);   // the <video> showing the camera
  const canvasRef = useRef(null);  // the <canvas> on top where the skeleton is drawn
  const { landmarkerRef, ready, error } = usePoseLandmarker(); // the pose model

  // Values shown on screen (changing these re-renders the page)
  const [angle, setAngle] = useState(null);
  const [reps, setReps] = useState(0);
  const [warning, setWarning] = useState("");

  // Values kept between frames without re-rendering
  const repLogRef = useRef([]);     // details of every finished rep
  const lastSpokenRef = useRef(0);  // when we last spoke (to avoid talking non-stop)

  // The exercise definition: label + which 3 body points to measure
  const ex = EXERCISES[plan.exerciseKey];

  // 1. Start the camera
  useEffect(() => {
    let stream;
    navigator.mediaDevices
      // Ask permission for the front ("user") camera, no microphone
      .getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false })
      .then((s) => {
        stream = s;
        videoRef.current.srcObject = s; // show the camera in the <video>
        return videoRef.current.play();
      })
      .catch((e) => setWarning("Camera blocked: " + e.message));
    // Cleanup: turn the camera off when leaving this screen
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  // 2. Detection loop (starts once the pose model is ready)
  useEffect(() => {
    if (!ready) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const draw = new DrawingUtils(ctx); // MediaPipe helper for drawing skeletons
    const smooth = makeSmoother(0.3);
    // A rep starts when the knee bends 20° past straight and ends when it comes back.
    const counter = makeRepCounter({
      bentAt: plan.maxAngle - 20,
      straightAt: plan.maxAngle - 10,
    });

    let rafId;          // ID of the scheduled next frame (so we can cancel it)
    let lastTime = -1;  // video time of the last frame we processed

    // Speak, but at most once every 2.5 seconds
    const sayOnce = (msg) => {
      const now = performance.now();
      if (now - lastSpokenRef.current > 2500) { // don't spam the patient
        speak(msg);
        lastSpokenRef.current = now;
      }
    };

    // Runs on every screen refresh (~30–60 times per second)
    const loop = () => {
      rafId = requestAnimationFrame(loop); // schedule the next run
      // Skip if the video isn't ready yet, or there's no new frame since last time
      if (video.readyState < 2 || video.currentTime === lastTime) return;
      lastTime = video.currentTime;

      // Make the drawing area match the camera size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Ask the model where the body points are in this frame
      const result = landmarkerRef.current.detectForVideo(video, performance.now());
      ctx.clearRect(0, 0, canvas.width, canvas.height); // erase last frame's drawing

      const lms = result.landmarks?.[0];        // normalized (for drawing)
      const world = result.worldLandmarks?.[0]; // meters (for angles)
      if (!lms || !world) return;               // no person found in this frame

      // Draw the skeleton: green lines between joints, orange dots on joints
      draw.drawConnectors(lms, PoseLandmarker.POSE_CONNECTIONS, { color: "#4ade80", lineWidth: 3 });
      draw.drawLandmarks(lms, { color: "#f97316", radius: 3 });

      // If part of the limb is off-camera, the angle can't be trusted
      if (!visibleEnough(lms, ex.points)) {
        setWarning("Move so the whole limb is in view");
        sayOnce(MESSAGES.notVisible);
        return;
      }

      // Measure the joint angle (e.g. hip-knee-ankle), smoothed to reduce jitter
      const [a, b, c] = ex.points.map((i) => world[i]);
      const ang = smooth(jointAngle(a, b, c));
      // Skip frames with no angle yet (avoids showing 0° / a false safety warning)
      if (ang == null) return;
      setAngle(Math.round(ang));

      // Safety check against the physio's limit (5° tolerance)
      if (ang < plan.minAngle - 5) {
        setWarning("Past your safe range!");
        sayOnce(MESSAGES.tooFar);
      } else {
        setWarning("");
      }

      // Count reps. When one finishes, check if it bent deep enough
      // (within 10° of the physio's target) and give spoken feedback.
      const { reps: r, completed } = counter(ang);
      if (completed) {
        const reachedTarget = completed.deepestAngle <= plan.minAngle + 10;
        repLogRef.current.push({ ...completed, reachedTarget, t: Date.now() });
        sayOnce(reachedTarget ? MESSAGES.good : MESSAGES.notEnough);
        setReps(r);
      }
    };

    loop();
    // Cleanup: stop the loop when leaving this screen
    return () => cancelAnimationFrame(rafId);
  }, [ready, plan, ex, landmarkerRef]);

  // 3. Send only numbers to the server, never video (privacy)
  async function finish() {
    // Build the summary the backend stores (matches backend/src/models/Session.js)
    const summary = {
      patientId,
      exerciseKey: plan.exerciseKey,
      reps: repLogRef.current,
      totalReps: repLogRef.current.length,
      goodReps: repLogRef.current.filter((r) => r.reachedTarget).length,
      performedAt: new Date().toISOString(),
    };
    try {
      // "/api/..." is forwarded to the backend by vite.config.js
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summary),
      });
      // fetch doesn't throw on server errors, so treat them like being offline
      if (!res.ok) throw new Error(`Server error ${res.status}`);
    } catch {
      // Offline / server down: keep it in the browser's storage so it isn't lost.
      // (Sending these saved sessions later is not built yet.)
      const queue = JSON.parse(localStorage.getItem("pendingSessions") || "[]");
      queue.push(summary);
      localStorage.setItem("pendingSessions", JSON.stringify(queue));
    }
    onFinish?.(summary); // tell the parent page we're done
  }

  if (error) return <p>Could not load the pose model: {String(error)}</p>;

  return (
    <div style={{ maxWidth: 640 }}>
      <h2>{ex.label}</h2>
      {/* Video and canvas are stacked: the skeleton drawing sits on top of the camera */}
      <div style={{ position: "relative" }}>
        {/* mirrored so it feels like a mirror to the patient */}
        <video ref={videoRef} playsInline muted style={{ width: "100%", transform: "scaleX(-1)" }} />
        <canvas ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "scaleX(-1)" }} />
      </div>
      {!ready && <p>Loading model…</p>}
      {/* Big, easy-to-read live numbers */}
      <p style={{ fontSize: 28 }}>
        Angle: {angle ?? "—"}° · Reps: {reps}/{plan.targetReps}
      </p>
      {warning && <p style={{ color: "crimson", fontSize: 22 }}>{warning}</p>}
      <button onClick={finish}>Finish session</button>
    </div>
  );
}
