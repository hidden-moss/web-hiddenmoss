import { sampleMotion, pointerForce, rippleForce, smooth, mix } from "./engine.mjs";

// Selected in the motion study by the owner on 2026-09-30.
export const SELECTED = Object.freeze({
  germinate: Object.freeze({ speed: 0.5, intensity: 1, loop: false }),
  breathe: Object.freeze({ speed: 1, intensity: 1.8, loop: true }),
  magnet: Object.freeze({ speed: 0.25, intensity: 0.3, loop: true }),
  echo: Object.freeze({ speed: 1, intensity: 0.85, loop: true }),
});
export const ENTRANCE_END = 6.4;
export const BLEND_DURATION = 1.6;

export function sampleIdentity(point, time) {
  if (time <= ENTRANCE_END)
    return sampleMotion(point, "germinate", time * SELECTED.germinate.speed, SELECTED.germinate.intensity);
  const age = time - ENTRANCE_END;
  const blend = smooth(age / BLEND_DURATION);
  const breath = sampleMotion(point, "breathe", age * SELECTED.breathe.speed, SELECTED.breathe.intensity);
  const magnet = sampleMotion(point, "magnet", age * SELECTED.magnet.speed, SELECTED.magnet.intensity);
  return {
    x: mix(point.x, breath.x, blend),
    y: mix(point.y, breath.y, blend),
    r: mix(point.r, breath.r * magnet.r / point.r, blend),
    opacity: 1,
  };
}

export function identityAttraction(point, pointer, mode = "attract") {
  return pointerForce(point, pointer, mode, SELECTED.magnet.intensity, "magnet");
}
export function identityRipple(point, ripples, time) {
  return rippleForce(point, ripples, time, SELECTED.echo.intensity);
}
