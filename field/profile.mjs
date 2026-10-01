import { smooth, mix, TAU } from "../motion/engine.mjs";
import { sampleIdentity, SELECTED, ENTRANCE_END, BLEND_DURATION } from "../motion/identity-profile.mjs";

export function backgroundBreath(time) {
  if (time <= ENTRANCE_END) return 1;
  const age = time - ENTRANCE_END;
  // Match the identity's 7.5s expansion/contraction. Below this contraction
  // threshold, background radii reach zero before gently growing back.
  const breath = Math.sin(age * SELECTED.breathe.speed * TAU / 7.5);
  const radius = smooth((breath + 0.65) / 1.65);
  return mix(1, radius, smooth(age / BLEND_DURATION));
}

export function sampleField(point, time, radiusGain = 1) {
  const shape = sampleIdentity(point, time);
  if (point.isLogo) return shape;
  return { ...shape, r: shape.r * radiusGain * backgroundBreath(time) };
}
