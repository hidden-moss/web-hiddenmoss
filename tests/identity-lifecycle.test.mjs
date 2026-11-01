import test from "node:test";
import assert from "node:assert/strict";

// Minimal DOM doubles exercise the component's clock/lifecycle without a browser.
const noop = () => {};
const context = new Proxy({}, { get: () => noop });
const canvas = { getContext: () => context, width: 1024, height: 640 };
const status = {};
globalThis.HTMLElement = class extends EventTarget {
  constructor() { super(); this.attrs = new Map(); this.dataset = {}; this.isConnected = true; }
  attachShadow() { this.shadowRoot = { querySelector: (s) => s === "canvas" ? canvas : status }; }
  setAttribute(key, value) {
    this.attrs.set(key, String(value));
    if (this.constructor.observedAttributes.includes(key)) this.attributeChangedCallback();
  }
  getAttribute(key) { return this.attrs.get(key) ?? null; }
  hasAttribute(key) { return this.attrs.has(key); }
  getBoundingClientRect() { return { width: 1024, height: 640 }; }
};
globalThis.customElements = { get: noop, define: noop };
globalThis.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
globalThis.document = { hidden: false };
const { HiddenMossIdentity } = await import("../motion/identity.mjs");
const point = { x: 540, y: 300, r: 4, a: 0.5, b: 0.5, c: 0.5, distance: 34 };
function mark() {
  const logo = new HiddenMossIdentity();
  logo.points = [point];
  logo.clearInteraction();
  logo.configure({ effect: "breathe", loop: true, interaction: "attract" });
  return logo;
}

test("pausing after the entrance resumes the same clock and never restarts the logo", () => {
  const logo = mark();
  logo.advanceClock(45);
  logo.play();
  assert.equal(logo.time, 45);
  logo.pause();
  logo.play();
  assert.equal(logo.time, 45);
  logo.advanceClock(0.02);
  assert.equal(logo.time, 45.02);
  assert.equal(logo.acceptsRipples, true);
});

test("reduced motion stops animation at the exact complete shape", () => {
  const logo = mark();
  logo.play();
  logo._reduced.matches = true;
  logo._onReduced();
  assert.equal(logo.playing, false);
  assert.equal(logo.time, logo.duration);
  const frame = logo.getFrame()[0];
  assert.equal(frame[0], point.x);
  assert.equal(frame[1], point.y);
  assert.equal(frame[3], 1);
});
