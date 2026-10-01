import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { preparePoints } from "../motion/engine.mjs";
import { createField, fieldLayout, latticeCoordinates } from "../field/geometry.mjs";
import { sampleIdentity, ENTRANCE_END } from "../motion/identity-profile.mjs";
import { sampleField, backgroundBreath } from "../field/profile.mjs";

const svg = readFileSync(new URL("../hidden_moss_circles_animated.svg", import.meta.url), "utf8");
const source = preparePoints([...svg.matchAll(/<circle\b[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"[^>]*r="([^"]+)"/g)]
  .map(match => ({ x: +match[1], y: +match[2], r: +match[3] })));

test("field preserves the complete central logo and fills other sites with tiny background dots", () => {
  assert.equal(source.length, 1750);
  const points = createField(source, fieldLayout(1440, 900));
  const byKey = new Map(points.map(point => [point.key, point]));
  const smallest = Math.min(...source.map(point => point.r));
  assert.equal(byKey.size, points.length, "no duplicate logo/background sites");
  assert.equal(points.filter(point => point.isLogo).length, source.length);
  assert(points.filter(point => !point.isLogo).every(point => point.r === smallest));
  for (const point of source) {
    const key = latticeCoordinates(point.x, point.y).map(Math.round).join(",");
    const generated = byKey.get(key);
    assert(generated, key);
    assert(generated.isLogo);
    for (const property of ["x", "y", "r", "a", "b", "c"]) assert.equal(generated[property], point[property]);
  }
});

test("field remains continuous on resize and matches the official stage alignment", () => {
  const size = fieldLayout(1440, 900);
  assert.equal(size.scale, 1120 / 1024);
  assert.equal(size.left + 512 * size.scale, 720);
  assert.equal(size.top + 320 * size.scale, 440);
  const first = new Map(createField(source, size).map(point => [point.key, point]));
  for (const point of createField(source, fieldLayout(1920, 1080))) {
    if (first.has(point.key)) assert.deepEqual(point, first.get(point.key));
  }
});

test("desktop and phone fields cover every edge throughout the breathing cycle", () => {
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390], [3840, 2160]]) {
    const size = fieldLayout(width, height);
    const points = createField(source, size);
    assert(points.length > 1750);
    assert(points.length < 120000);
    for (const time of [8, 10, 12, 14, 16]) {
      const frame = points.map(point => sampleIdentity(point, time));
      const xs = frame.map(p => p.x * size.scale + size.left);
      const ys = frame.map(p => p.y * size.scale + size.top);
      assert(Math.min(...xs) < -20 && Math.max(...xs) > width + 20);
      assert(Math.min(...ys) < -20 && Math.max(...ys) > height + 20);
      assert(frame.every(p => p.r > 0 && Number.isFinite(p.x + p.y + p.r)));
    }
  }
});

test("very short split panes keep a bounded point count", () => {
  const size = fieldLayout(1280, 80);
  assert.equal(size.scale, 0.25);
  assert(createField(source, size).length < 70000);
});

test("background disappears at contraction and regrows with the logo without changing logo motion", () => {
  const points = createField(source, fieldLayout(1440, 900));
  const logo = points.find(point => point.isLogo);
  const background = points.filter(point => !point.isLogo);
  const peak = ENTRANCE_END + 7.5 / 4;
  const trough = ENTRANCE_END + 7.5 * 3 / 4;
  assert.equal(backgroundBreath(peak), 1);
  assert.equal(backgroundBreath(trough), 0);
  for (const point of background) {
    assert.equal(sampleField(point, trough, 4).r, 0);
    assert(sampleField(point, peak + 7.5, 3.3).r > 0);
  }
  for (const time of [0, 2, ENTRANCE_END, peak, trough, peak + 7.5]) {
    assert.deepEqual(sampleField(logo, time, 4), sampleIdentity(logo, time));
  }
});

test("background breathing enters smoothly and repeats without a cycle-boundary jump", () => {
  assert.equal(backgroundBreath(ENTRANCE_END), 1);
  assert(Math.abs(backgroundBreath(ENTRANCE_END + 0.0001) - 1) < 1e-7);
  for (let age = 2; age < 9.5; age += 0.1) {
    const value = backgroundBreath(ENTRANCE_END + age);
    assert(value >= 0 && value <= 1);
    assert(Math.abs(value - backgroundBreath(ENTRANCE_END + age + 7.5)) < 1e-12);
  }
});
