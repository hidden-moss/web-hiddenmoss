/** Pure, deterministic motion math. Coordinates use a 1024 × 640 stage. */
export const WIDTH = 1024;
export const HEIGHT = 640;
export const INK = "#efefe6";
export const PAPER = "#000000";
export const TAU = Math.PI * 2;
export const EFFECTS = Object.freeze([
  {
    id: "converge",
    number: "01",
    name: "四散归拢",
    english: "Come together",
    kind: "entrance",
    category: "入场",
    duration: 7,
    sample: 1.8,
    interaction: "repel",
    description:
      "从画面四周启程，沿着柔和的弧线慢慢归位。散落的点，最终成为同一个名字。",
    hint: "移动鼠标，轻轻推开圆点",
    use: "适合首页首次进入。约 4 秒成形，随后静止。",
  },
  {
    id: "germinate",
    number: "02",
    name: "聚合生长",
    english: "Take root",
    kind: "entrance",
    category: "入场",
    duration: 6.4,
    sample: 1.5,
    interaction: "attract",
    description:
      "从细小的种子开始，沿着一条看不见的生长线，逐渐展开 Hiddenmoss 的轮廓。",
    hint: "移动鼠标，让圆点向你靠近",
    use: "适合安静的开场。比四散归拢更轻、更短。",
  },
  {
    id: "breathe",
    number: "03",
    name: "自然呼吸",
    english: "Still alive",
    kind: "ambient",
    category: "常驻",
    duration: 7.5,
    sample: 2.1,
    interaction: "attract",
    description:
      "让标志保留一点生命感。圆点缓慢起伏，几乎不改变轮廓，但始终在呼吸。",
    hint: "悬停在标志上，感受轻微吸引",
    use: "适合长时间常驻。幅度较小，不抢正文注意力。",
  },
  {
    id: "wave",
    number: "04",
    name: "波纹流动",
    english: "Soft current",
    kind: "ambient",
    category: "常驻",
    duration: 6.4,
    sample: 1.4,
    interaction: "ripple",
    description:
      "一阵缓慢的流动掠过点阵。像风经过水面，文字在起伏之间仍然清晰可读。",
    hint: "点击画布，叠加一圈涟漪",
    use: "适合视觉主导的首屏。也可以降到 0.5× 慢放。",
  },
  {
    id: "orbit",
    number: "05",
    name: "旋涡归位",
    english: "Find an orbit",
    kind: "entrance",
    category: "入场",
    duration: 8,
    sample: 2.05,
    interaction: "repel",
    description:
      "点阵先围绕一个中心旋转，再沿轨道舒展、落定。多一点空间感，多一点仪式感。",
    hint: "移动鼠标，在轨道里留下一点扰动",
    use: "适合有记忆点的开场。成形后保留完整标志。",
  },
  {
    id: "magnet",
    number: "06",
    name: "磁场牵引",
    english: "Drawn to you",
    kind: "interactive",
    category: "交互",
    duration: 7.5,
    sample: 2,
    interaction: "attract",
    description:
      "光标成为一枚看不见的磁铁。附近的点朝你靠近，离开后，柔软地回到原位。",
    hint: "在字形之间慢慢移动鼠标",
    use: "适合桌面首页。触屏轻触可产生同样的吸引。",
  },
  {
    id: "scatter",
    number: "07",
    name: "风吹草动",
    english: "Make some room",
    kind: "interactive",
    category: "交互",
    duration: 7.5,
    sample: 2,
    interaction: "repel",
    description:
      "用鼠标拨开一片点阵，留下短暂的空隙。像拨动苔藓，松手后又缓缓合拢。",
    hint: "移过标志，或按住拖动来拨散",
    use: "适合更有玩心的首页。标志会自动恢复，不会散失。",
  },
  {
    id: "echo",
    number: "08",
    name: "点击涟漪",
    english: "Leave an echo",
    kind: "interactive",
    category: "交互",
    duration: 6,
    sample: 1.05,
    interaction: "ripple",
    description:
      "一个点击，一圈回声。冲击波穿过圆点，渐渐平息；每次触碰都能产生新的回应。",
    hint: "点击任意位置，也可以连续点几下",
    use: "适合桌面和触屏。轻点互动，空闲时保持安静。",
  },
]);

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => {
  const v = clamp(t);
  return v * v * (3 - 2 * v);
};
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);
export function random(index, salt = 42) {
  let x = Math.imul(index + 1, 374761393) ^ Math.imul(salt, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
export function effectById(id) {
  return EFFECTS.find((effect) => effect.id === id) || EFFECTS[0];
}
export function normalizeSettings(value = {}) {
  const input = value && typeof value === "object" ? value : {};
  const number = (key, fallback, min, max) =>
    typeof input[key] === "number" && Number.isFinite(input[key])
      ? clamp(input[key], min, max)
      : fallback;
  const effect = effectById(input.effect);
  return {
    effect: effect.id,
    speed: number("speed", 1, 0.1, 2),
    intensity: number("intensity", 1, 0.3, 1.8),
    interaction: ["auto", "attract", "repel", "ripple", "off"].includes(
      input.interaction,
    )
      ? input.interaction
      : "auto",
    loop:
      typeof input.loop === "boolean" ? input.loop : effect.kind !== "entrance",
  };
}
export function preparePoints(points) {
  return points.map((point, index) => {
    if (![point.x, point.y, point.r].every(Number.isFinite) || point.r <= 0)
      throw new Error("Invalid source point");
    const x = point.x,
      y = point.y - 192;
    return Object.freeze({
      x,
      y,
      r: point.r * 0.9,
      distance: Math.hypot(x - 512, y - 320),
      angle: Math.atan2(y - 320, x - 512),
      a: random(index, 7),
      b: random(index, 19),
      c: random(index, 31),
    });
  });
}

export function sampleMotion(point, effectId, time, intensity = 1) {
  const t = Math.max(0, time),
    amount = clamp(intensity, 0.3, 1.8);
  let x = point.x,
    y = point.y,
    r = point.r,
    opacity = 1;
  if (effectId === "converge") {
    const q = clamp((t - point.a * 0.65) / (2.6 + point.b * 0.75));
    const e = easeOut(q),
      spread = (660 + point.c * 400) * (0.75 + amount * 0.25);
    const angle = point.a * TAU;
    const arc =
      Math.sin(q * Math.PI) * (1 - q) * 100 * (point.b - 0.5) * amount;
    x = mix(512 + Math.cos(angle) * spread, x, e) - Math.sin(angle) * arc;
    y = mix(320 + Math.sin(angle) * spread * 0.7, y, e) + Math.cos(angle) * arc;
    r *= mix(0.3, 1, e);
    opacity = smooth(q / 0.18);
  } else if (effectId === "germinate") {
    const delay =
      clamp((point.x - 120) / 800) * 0.85 +
      clamp((520 - point.y) / 450) * 0.35 +
      point.a * 0.2;
    const q = clamp((t - delay) / 1.8);
    const e = easeOut(q);
    x += (point.b - 0.5) * 38 * (1 - e) * amount;
    y += 65 * (1 - e) * amount;
    r *= e + Math.sin(q * Math.PI) * 0.16;
    opacity = smooth(q / 0.3);
  } else if (effectId === "orbit") {
    const q = clamp((t - point.a * 0.4) / 4.2);
    const e = easeInOut(q);
    const angle = point.angle + (1 - e) * (TAU * 1.05 + point.b * 0.7) * amount;
    const distance = mix(390 + point.c * 320, point.distance, e);
    x = 512 + Math.cos(angle) * distance;
    y = 320 + Math.sin(angle) * distance * mix(0.65, 1, e);
    r *= mix(0.35, 1, easeOut(q));
    opacity = smooth(q / 0.13);
  } else if (effectId === "breathe") {
    const breath = Math.sin((t * TAU) / 7.5);
    const local = Math.sin((t * TAU) / 7.5 - point.distance / 180);
    x = 512 + (x - 512) * (1 + breath * 0.018 * amount);
    y = 320 + (y - 320) * (1 + breath * 0.028 * amount);
    r *= 1 + local * 0.16 * amount;
  } else if (effectId === "wave") {
    const phase = (t * TAU) / 6.4;
    const wave = Math.sin(point.x / 130 - phase);
    y += wave * 19 * amount;
    x += Math.cos(point.y / 110 - phase) * 5 * amount;
    r *= 1 + wave * 0.09 * amount;
  } else if (effectId === "magnet") {
    r *= 1 + Math.sin((t * TAU) / 7.5) * 0.035 * amount;
  } else if (effectId === "scatter") {
    r *= 1 + Math.sin((t * TAU) / 7.5 + point.a * TAU) * 0.025 * amount;
  }
  return { x, y, r: Math.max(0, r), opacity };
}

/** Exact solution of a critically damped spring over dt; stable after a slow frame. */
export function spring(position, velocity, target, dt, frequency = 11) {
  const d = position - target,
    h = clamp(dt, 0, 0.05),
    decay = Math.exp(-frequency * h);
  const c = velocity + frequency * d;
  return [target + (d + c * h) * decay, (velocity - frequency * c * h) * decay];
}

export function pointerForce(point, pointer, mode, intensity = 1, effect = "") {
  if (!pointer || !pointer.active || mode === "off" || mode === "ripple")
    return [0, 0, 1];
  let dx = point.x - pointer.x,
    dy = point.y - pointer.y;
  const distance = Math.hypot(dx, dy);
  const radius = effect === "scatter" ? 160 : 190;
  const falloff =
    Math.pow(clamp(1 - distance / radius), 2) * clamp(pointer.weight ?? 1);
  if (distance < 0.001) {
    dx = 1;
    dy = 0;
  }
  const unit = Math.max(1, distance);
  const strength =
    (effect === "scatter" ? 145 : effect === "magnet" ? 95 : 48) * intensity;
  const direction = mode === "attract" ? -1 : 1;
  const swirl = effect === "scatter" ? 0.25 : 0;
  return [
    ((dx / unit) * direction - (dy / unit) * swirl) * falloff * strength,
    ((dy / unit) * direction + (dx / unit) * swirl) * falloff * strength,
    1 + falloff * (mode === "attract" ? 0.3 : -0.1),
  ];
}

export function rippleForce(point, ripples, time, intensity = 1) {
  let x = 0,
    y = 0,
    size = 0;
  for (const ripple of ripples) {
    const age = time - ripple.time;
    if (age < 0 || age > 3.2) continue;
    const dx = point.x - ripple.x,
      dy = point.y - ripple.y;
    const distance = Math.hypot(dx, dy);
    const delta = distance - age * 270;
    const envelope =
      Math.exp(-(delta * delta) / (2 * 34 * 34)) *
      Math.exp(-age * 1.25) *
      intensity;
    const force = envelope * 33;
    x += (dx / Math.max(1, distance)) * force;
    y += (dy / Math.max(1, distance)) * force;
    size += envelope * 0.3;
  }
  return [x, y, 1 + size];
}
