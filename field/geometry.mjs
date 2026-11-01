import { random } from "../motion/engine.mjs";

// Fitted lattice from hidden_moss_circles.json, translated to the motion stage.
export const LATTICE = Object.freeze({
  origin: [10.462837540718583, 3.497479347564804 - 192],
  u: [10.759177192790924, 3.4996997383710595],
  v: [-3.4991149710272147, 10.759276223491371],
});

export function latticeCoordinates(x, y) {
  const { origin, u, v } = LATTICE;
  const dx = x - origin[0], dy = y - origin[1];
  const determinant = u[0] * v[1] - u[1] * v[0];
  return [(dx * v[1] - dy * v[0]) / determinant,
    (dy * u[0] - dx * u[1]) / determinant];
}

// Match the published site's centered stage, including its 40/60px padding.
export function fieldLayout(width, height) {
  const padding = width <= 600 ? 8 : 48;
  // Tiny split panes must not create millions of subpixel dots.
  const scale = Math.max(0.25, Math.min(width - padding, 1120, (height - 100) * 1.6) / 1024);
  return { width, height, scale,
    left: (width - 1024 * scale) / 2,
    top: (height - 640 * scale) / 2 - 10 };
}

export function createField(source, size) {
  if (!source.length) return [];
  const radius = Math.min(...source.map(point => point.r));
  const original = new Map(source.map(point => {
    const [i, j] = latticeCoordinates(point.x, point.y).map(Math.round);
    return [`${i},${j}`, point];
  }));
  // Overscan covers breathing contraction, entrance travel and pointer offsets.
  const margin = Math.max(size.width, size.height) / size.scale * 0.08 + 100;
  const minX = -size.left / size.scale - margin;
  const minY = -size.top / size.scale - margin;
  const maxX = (size.width - size.left) / size.scale + margin;
  const maxY = (size.height - size.top) / size.scale + margin;
  const corners = [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]]
    .map(([x, y]) => latticeCoordinates(x, y));
  const minI = Math.floor(Math.min(...corners.map(p => p[0])));
  const maxI = Math.ceil(Math.max(...corners.map(p => p[0])));
  const minJ = Math.floor(Math.min(...corners.map(p => p[1])));
  const maxJ = Math.ceil(Math.max(...corners.map(p => p[1])));
  const { origin, u, v } = LATTICE;
  const points = [];
  for (let j = minJ; j <= maxJ; j++) {
    for (let i = minI; i <= maxI; i++) {
      const x = origin[0] + i * u[0] + j * v[0];
      const y = origin[1] + i * u[1] + j * v[1];
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      const key = `${i},${j}`;
      const existing = original.get(key);
      if (existing) {
        // The central logo keeps its original radii, centers and entrance timing.
        // Each lattice site is drawn once, so the background cannot double it.
        points.push({ ...existing, key, isLogo: true });
      } else {
        const seed = Math.imul(i, 73856093) ^ Math.imul(j, 19349663);
        points.push({ key, x, y, r: radius, isLogo: false,
          distance: Math.hypot(x - 512, y - 320),
          angle: Math.atan2(y - 320, x - 512),
          a: random(seed, 7), b: random(seed, 19), c: random(seed, 31) });
      }
    }
  }
  return points;
}
