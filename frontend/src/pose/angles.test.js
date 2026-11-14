// Tests for the angle maths and rep counting. Run with:  npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jointAngle, flexionAngle, hipAbductionAngle, makeRepCounter, measureAngle,
  outsideSafeRange, EXERCISES,
} from "./angles.js";

const p = (x, y, z = 0) => ({ x, y, z });
const close = (actual, expected, tol = 0.5) =>
  assert.ok(Math.abs(actual - expected) <= tol, `expected ~${expected}, got ${actual}`);

// Moves from `from` to `to` and back, `times` times, in 5° steps
function cycles(from, to, times, back = from) {
  const out = [];
  const step = (a, b) => {
    const s = a < b ? 5 : -5;
    for (let v = a; s > 0 ? v <= b : v >= b; v += s) out.push(v);
  };
  for (let i = 0; i < times; i++) { step(from, to); step(to, back); }
  return out;
}
function run(plan, angles) {
  const count = makeRepCounter(plan);
  const done = [];
  let last;
  for (const a of angles) {
    last = count(a);
    if (last.completed) done.push(last.completed);
  }
  return { reps: last.reps, done };
}

test("jointAngle: right angle and straight line", () => {
  close(jointAngle(p(1, 0), p(0, 0), p(0, 1)), 90);
  close(jointAngle(p(-1, 0), p(0, 0), p(1, 0)), 180);
  assert.equal(jointAngle(p(0, 0), p(0, 0), p(1, 0)), null);
});

test("flexionAngle: straight joint is 0°, right angle is 90°", () => {
  close(flexionAngle(p(0, -1), p(0, 0), p(0, 1)), 0);
  close(flexionAngle(p(0, -1), p(0, 0), p(1, 0)), 90);
});

test("hip abduction: 0° straight down, 30° out, 0° when moving inwards", () => {
  // y points down (like MediaPipe). Right hip at x=0.1, left hip at x=-0.1.
  const shoulder = p(0.1, -0.5), hip = p(0.1, 0), other = p(-0.1, 0);
  const L = 0.45, rad = (d) => (d * Math.PI) / 180;
  close(hipAbductionAngle(shoulder, hip, p(0.1, L), other), 0);
  close(hipAbductionAngle(shoulder, hip, p(0.1 + L * Math.sin(rad(30)), L * Math.cos(rad(30))), other), 30);
  assert.equal(hipAbductionAngle(shoulder, hip, p(0.1 - 0.1, L), other), 0); // inwards
});

test("hip abduction: works with y pointing up, and with a tilted body", () => {
  const flip = (q) => p(q.x, -q.y);
  const L = 0.45, rad = (d) => (d * Math.PI) / 180;
  const knee30 = p(0.1 + L * Math.sin(rad(30)), L * Math.cos(rad(30)));
  close(hipAbductionAngle(flip(p(0.1, -0.5)), flip(p(0.1, 0)), flip(knee30), flip(p(-0.1, 0))), 30);
  // Rotate everything 10° (pelvis tilted): still 30°
  const rot = (q, d = rad(10)) => p(q.x * Math.cos(d) - q.y * Math.sin(d), q.x * Math.sin(d) + q.y * Math.cos(d));
  close(hipAbductionAngle(rot(p(0.1, -0.5)), rot(p(0.1, 0)), rot(knee30), rot(p(-0.1, 0))), 30);
});

test("measureAngle uses the right landmarks for each exercise and side", () => {
  const world = Array.from({ length: 33 }, () => p(0, 0));
  // Right leg bent 90°: hip(24) above knee(26), ankle(28) to the side
  world[24] = p(0, -1); world[26] = p(0, 0); world[28] = p(1, 0);
  close(measureAngle("supine_heel_slide", "right", world), 90);
  // Left side points are all at the origin -> no angle
  assert.equal(measureAngle("supine_heel_slide", "left", world), null);
  assert.equal(measureAngle("unknown", "right", world), null);
  assert.equal(Object.keys(EXERCISES).length, 5);
});

test("heel slide 0° -> 90° x3: 3 good reps", () => {
  const { reps, done } = run({ start: 0, target: 90 }, cycles(0, 90, 3));
  assert.equal(reps, 3);
  assert.ok(done.every((d) => d.reachedTarget && d.peakAngle === 90));
});

test("seated knee extension 90° -> 0° (angle goes DOWN): 3 good reps", () => {
  const { reps, done } = run({ start: 90, target: 0 }, cycles(90, 0, 3));
  assert.equal(reps, 3);
  assert.ok(done.every((d) => d.reachedTarget && d.peakAngle === 0));
});

test("lenient: patient who only returns to 15° (not 0°) still gets reps", () => {
  const { reps } = run({ start: 0, target: 90 }, [0, ...cycles(15, 90, 3)]);
  assert.equal(reps, 3);
});

test("lenient: reaching 75° of a 90° target counts as good", () => {
  const { done } = run({ start: 0, target: 90 }, cycles(0, 75, 2));
  assert.equal(done.length, 2);
  assert.ok(done.every((d) => d.reachedTarget));
});

test("half-way rep counts but is not good", () => {
  const { done } = run({ start: 0, target: 90 }, cycles(0, 45, 1));
  assert.equal(done.length, 1);
  assert.equal(done[0].reachedTarget, false);
});

test("tiny movements don't count", () => {
  const { reps } = run({ start: 0, target: 90 }, cycles(0, 30, 5));
  assert.equal(reps, 0);
});

test("wobbling around one point doesn't double count", () => {
  const wobble = [0, 40, 80, 90, 60, 25, 21, 24, 19, 22, 18, 25, 20, 0];
  const { reps } = run({ start: 0, target: 90 }, wobble);
  assert.equal(reps, 1);
});

test("shoulder raise 0° -> 120° x2 counts on the way back down", () => {
  const { reps, done } = run({ start: 0, target: 120 }, cycles(0, 120, 2));
  assert.equal(reps, 2);
  assert.ok(done.every((d) => d.peakAngle === 120));
});

test("missing frames (null) are ignored", () => {
  const { reps } = run({ start: 0, target: 90 }, [0, null, 50, null, 90, null, 10]);
  assert.equal(reps, 1);
});

test("safety range has a 5° margin", () => {
  const plan = { permittedMin: 0, permittedMax: 100 };
  assert.equal(outsideSafeRange(104, plan), false);
  assert.equal(outsideSafeRange(106, plan), true);
  assert.equal(outsideSafeRange(-6, plan), true);
});
