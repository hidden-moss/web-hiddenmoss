import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { preparePoints } from "../motion/engine.mjs";
import { ENTRANCE_END, sampleIdentity, identityAttraction, identityRipple } from "../motion/identity-profile.mjs";

const source = readFileSync(new URL("../hidden_moss_circles_animated.svg", import.meta.url), "utf8");
const points = preparePoints([...source.matchAll(/<circle\b[^>]*cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)]
  .map((m) => ({ x: +m[1], y: +m[2], r: +m[3] })));

test("the entrance resolves every source dot before breathing fades in without a jump", () => {
  for (const point of points) {
    const before = sampleIdentity(point, ENTRANCE_END - 0.00001);
    const seam = sampleIdentity(point, ENTRANCE_END);
    const after = sampleIdentity(point, ENTRANCE_END + 0.00001);
    for (const key of ["x", "y", "r"]) {
      assert.ok(Math.abs(seam[key] - point[key]) < 1e-8);
      assert.ok(Math.abs(before[key] - after[key]) < 0.001);
    }
    assert.equal(seam.opacity, 1);
  }
});

test("the mark remains visible and continuous beyond the first cycle", () => {
  for (const point of points) {
    for (const time of [8, 13.9, 21.4, 36.4, 1000]) {
      const a = sampleIdentity(point, time - 0.00001);
      const b = sampleIdentity(point, time + 0.00001);
      assert.equal(b.opacity, 1);
      assert.ok(b.r > 0);
      for (const key of ["x", "y", "r"]) {
        assert.ok(Number.isFinite(b[key]));
        assert.ok(Math.abs(a[key] - b[key]) < 0.01);
      }
    }
  }
});

test("gentle attraction and a stronger click echo coexist and return to rest", () => {
  const shape = { x: 550, y: 320 };
  const pointer = { x: 512, y: 320, active: true, weight: 1 };
  const pull = identityAttraction(shape, pointer);
  const echo = identityRipple(shape, [{ x: 512, y: 320, time: 0 }], 0.14);
  assert.ok(pull[0] < 0 && Math.abs(pull[0]) < 28.5);
  assert.ok(echo[0] > 0);
  assert.deepEqual(identityAttraction(shape, { ...pointer, active: false }), [0, 0, 1]);
  assert.deepEqual(identityRipple(shape, [{ x: 512, y: 320, time: 0 }], 4), [0, 0, 1]);
});
