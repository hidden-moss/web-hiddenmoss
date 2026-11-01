import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EFFECTS,
  normalizeSettings,
  preparePoints,
  sampleMotion,
  pointerForce,
  rippleForce,
  spring,
} from "../motion/engine.mjs";

const source = readFileSync(
  new URL("../hidden_moss_circles_animated.svg", import.meta.url),
  "utf8",
);
const original = [
  ...source.matchAll(/<circle\b[^>]*cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g),
].map((match) => ({
  x: Number(match[1]),
  y: Number(match[2]),
  r: Number(match[3]),
}));
const points = preparePoints(original);
const frame = (effect, time, amount = 1) =>
  points.map((point) => sampleMotion(point, effect, time, amount));
const close = (a, b) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} is not close to ${b}`);

test("After dark preserves all 1,750 source points and its original 0.9 radius setting", () => {
  assert.equal(points.length, 1750);
  points.forEach((point, i) => {
    close(point.x, original[i].x);
    close(point.y, original[i].y - 192);
    close(point.r, original[i].r * 0.9);
  });
  assert.deepEqual(points, preparePoints(original));
  assert.throws(() => preparePoints([{ x: NaN, y: 0, r: 1 }]));
});

test("all three entrance concepts resolve to the exact same legible logo", () => {
  for (const effect of EFFECTS.filter((effect) => effect.kind === "entrance")) {
    for (const intensity of [0.3, 1, 1.8]) {
      const settled = frame(effect.id, effect.duration, intensity);
      settled.forEach((dot, i) => {
        close(dot.x, points[i].x);
        close(dot.y, points[i].y);
        close(dot.r, points[i].r);
        close(dot.opacity, 1);
      });
      assert.notDeepEqual(frame(effect.id, 1.1, intensity), settled);
    }
  }
  assert.notDeepEqual(frame("converge", 1), frame("germinate", 1));
  assert.notDeepEqual(frame("converge", 1), frame("orbit", 1));
});

test("ambient loops meet smoothly at their boundaries", () => {
  for (const effect of EFFECTS.filter((effect) => effect.kind === "ambient")) {
    frame(effect.id, 0).forEach((dot, i) => {
      const end = sampleMotion(points[i], effect.id, effect.duration);
      close(dot.x, end.x);
      close(dot.y, end.y);
      close(dot.r, end.r);
    });
    assert.notDeepEqual(frame(effect.id, 0), frame(effect.id, 1.7));
  }
});

test("all effects stay finite and bounded in opacity at every supported intensity", () => {
  for (const effect of EFFECTS)
    for (const intensity of [0.3, 1, 1.8]) {
      for (const time of [0, 0.1, 0.8, 2, 4, effect.duration, 100]) {
        assert.ok(
          frame(effect.id, time, intensity).every(
            (dot) =>
              Object.values(dot).every(Number.isFinite) &&
              dot.r >= 0 &&
              dot.opacity >= 0 &&
              dot.opacity <= 1,
          ),
        );
      }
    }
});

test("magnet attracts, scatter repels, the center stays finite, and inactive pointers have no force", () => {
  const point = { x: 100, y: 100 },
    pointer = { x: 80, y: 100, active: true, weight: 1 };
  assert.ok(pointerForce(point, pointer, "attract", 1, "magnet")[0] < 0);
  assert.ok(pointerForce(point, pointer, "repel", 1, "scatter")[0] > 0);
  assert.ok(
    pointerForce(point, { ...pointer, x: 100 }, "repel").every(Number.isFinite),
  );
  assert.deepEqual(
    pointerForce(point, { ...pointer, active: false }, "attract"),
    [0, 0, 1],
  );
  assert.deepEqual(pointerForce(point, pointer, "off"), [0, 0, 1]);
  assert.deepEqual(
    pointerForce({ x: 1000, y: 1000 }, pointer, "repel"),
    [0, 0, 1],
  );
});

test("springs return home without numerical explosion under variable frame rates", () => {
  let position = 120,
    velocity = 0;
  for (let i = 0; i < 240; i++)
    [position, velocity] = spring(
      position,
      velocity,
      0,
      i % 3 === 0 ? 0.05 : 1 / 60,
      8,
    );
  assert.ok(Math.abs(position) < 1e-6);
  assert.ok(Math.abs(velocity) < 1e-5);
  const held = spring(120, 0, 0, 0);
  assert.deepEqual(held, [120, 0]);
  assert.ok(spring(120, 100, 0, 20).every(Number.isFinite));
});

test("click ripples travel outward, decay, and never affect earlier or expired frames", () => {
  const waves = [{ x: 100, y: 100, time: 1 }];
  assert.deepEqual(rippleForce({ x: 200, y: 100 }, waves, 0.5), [0, 0, 1]);
  assert.ok(rippleForce({ x: 235, y: 100 }, waves, 1.5)[0] > 0);
  assert.deepEqual(rippleForce({ x: 200, y: 100 }, waves, 5), [0, 0, 1]);
  assert.ok(rippleForce({ x: 100, y: 100 }, waves, 1).every(Number.isFinite));
});

test("shared settings reject unknown effects and hostile or non-finite values", () => {
  assert.deepEqual(normalizeSettings(null), normalizeSettings());
  const safe = normalizeSettings({
    effect: "<script>",
    speed: Infinity,
    intensity: 99,
    interaction: "evil",
    loop: "yes",
  });
  assert.equal(safe.effect, "converge");
  assert.equal(safe.speed, 1);
  assert.equal(safe.intensity, 1.8);
  assert.equal(safe.interaction, "auto");
  assert.equal(safe.loop, false);
  assert.equal(normalizeSettings({ effect: "breathe" }).loop, true);
  assert.equal(normalizeSettings({ speed: -100 }).speed, 0.1);
});
