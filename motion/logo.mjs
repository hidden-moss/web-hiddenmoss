import {
  WIDTH,
  HEIGHT,
  INK,
  PAPER,
  clamp,
  effectById,
  normalizeSettings,
  preparePoints,
  sampleMotion,
  spring,
  pointerForce,
  rippleForce,
} from "./engine.mjs";

let sourcePromise;
export function loadLogoPoints() {
  if (!sourcePromise) {
    sourcePromise = fetch(
      new URL("../hidden_moss_circles_animated.svg", import.meta.url),
    )
      .then((response) => {
        if (!response.ok)
          throw new Error(`Source SVG: HTTP ${response.status}`);
        return response.text();
      })
      .then((text) => {
        const document = new DOMParser().parseFromString(text, "image/svg+xml");
        if (document.querySelector("parsererror"))
          throw new Error("Invalid source SVG");
        const dots = [
          ...document.querySelectorAll("#hidden-moss-dots circle"),
        ].map((circle) => ({
          x: Number(circle.getAttribute("cx")),
          y: Number(circle.getAttribute("cy")),
          r: Number(circle.getAttribute("r")),
        }));
        if (!dots.length) throw new Error("Source SVG contains no dots");
        return preparePoints(dots);
      })
      .catch((error) => {
        sourcePromise = null;
        throw error;
      });
  }
  return sourcePromise;
}

/** A dependency-free, embeddable logo. The demo and website use this same component. */
export class HiddenMossMotion extends HTMLElement {
  static observedAttributes = [
    "effect",
    "speed",
    "intensity",
    "interaction",
    "loop",
  ];
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>:host{display:block;position:relative;width:100%;height:100%;overflow:hidden;background:${PAPER};touch-action:pan-y}canvas{display:block;width:100%;height:100%}:host(:focus-visible){outline:1px solid #c5d6ad;outline-offset:-3px}.status{position:absolute;inset:0;display:grid;place-content:center;color:${INK};font:12px system-ui;text-align:center;padding:30px}.status[hidden]{display:none}</style><canvas aria-hidden="true"></canvas><div class="status" part="status">正在唤醒点阵…</div>`;
    this.canvas = this.shadowRoot.querySelector("canvas");
    this.context = this.canvas.getContext("2d", { alpha: false });
    this.statusElement = this.shadowRoot.querySelector(".status");
    this.points = [];
    this.offsets = [];
    this.ripples = [];
    this.time = 0;
    this._interactionTime = 0;
    this._externallyPlaying = false;
    this.playing = false;
    this._settings = normalizeSettings();
    this._frame = null;
    this._last = null;
    this._size = { width: 1, height: 1, ratio: 1, scale: 1, left: 0, top: 0 };
    this.pointer = {
      x: 512,
      y: 320,
      active: false,
      weight: 0,
      targetWeight: 0,
    };
    this._reduced = matchMedia("(prefers-reduced-motion: reduce)");
    this._onReduced = () => {
      if (this._reduced.matches) {
        this.pause();
        this.seek(this.duration);
      }
    };
    this._onVisibility = () => {
      this._last = null;
    };
    this._drawLoop = (now) => {
      if (!this.playing || !this.isConnected) return;
      const dt =
        this._last === null ? 0 : clamp((now - this._last) / 1000, 0, 0.05);
      this._last = now;
      if (!document.hidden && this._visible) {
        this.advanceClock(dt);
        this.render(dt);
        this.dispatchEvent(
          new CustomEvent("motion-frame", {
            detail: {
              time: this.time,
              duration: this.duration,
              dt,
              playing: this.playing,
            },
          }),
        );
      }
      if (this.playing) this._frame = requestAnimationFrame(this._drawLoop);
    };
    this.addEventListener("pointermove", (event) => this._pointerMove(event));
    this.addEventListener("pointerdown", (event) => {
      this._pointerMove(event);
      if (
        this.acceptsRipples &&
        (this.playing || this._externallyPlaying)
      ) {
        this.ripples.push({
          x: this.pointer.x,
          y: this.pointer.y,
          time: this._interactionTime,
        });
        this.ripples = this.ripples.slice(-5);
      }
    });
    this.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse" || !this._touchRelease)
        this.releasePointer();
    });
    this.addEventListener("pointercancel", () => this.releasePointer());
    this.addEventListener("pointerup", (event) => {
      if (event.pointerType !== "mouse") {
        // A quick tap can begin and end between two animation frames. Hold its
        // influence briefly so attraction/repulsion is visible on touchscreens.
        clearTimeout(this._touchRelease);
        this._touchRelease = setTimeout(() => this.releasePointer(), 420);
      }
    });
  }

  connectedCallback() {
    this._visible = true;
    this.setAttribute("role", "img");
    this.setAttribute(
      "aria-label",
      `Hiddenmoss · ${effectById(this.getAttribute("effect")).name}`,
    );
    this._resize = new ResizeObserver(() => this.resize());
    this._resize.observe(this);
    this._intersection = new IntersectionObserver(([entry]) => {
      this._visible = entry.isIntersecting;
      this._last = null;
    });
    this._intersection.observe(this);
    this._reduced.addEventListener("change", this._onReduced);
    document.addEventListener("visibilitychange", this._onVisibility);
    this._readSettings();
    this.reload();
  }
  disconnectedCallback() {
    this.pause();
    clearTimeout(this._touchRelease);
    this._resize?.disconnect();
    this._intersection?.disconnect();
    this._reduced.removeEventListener("change", this._onReduced);
    document.removeEventListener("visibilitychange", this._onVisibility);
  }
  attributeChangedCallback() {
    this._readSettings();
  }
  _readSettings() {
    const oldEffect = this._settings.effect;
    this._settings = normalizeSettings({
      effect: this.getAttribute("effect"),
      speed: Number(this.getAttribute("speed") ?? 1),
      intensity: Number(this.getAttribute("intensity") ?? 1),
      interaction: this.getAttribute("interaction") || "auto",
      loop: this.hasAttribute("loop")
        ? this.getAttribute("loop") === "true"
        : undefined,
    });
    this.setAttribute(
      "aria-label",
      `Hiddenmoss · ${effectById(this._settings.effect).name}`,
    );
    if (oldEffect !== this._settings.effect) {
      this.time = 0;
      this.clearInteraction();
    }
    if (this.points.length) this.render(0);
  }
  advanceClock(dt) {
    this.time += dt * this._settings.speed;
    this._interactionTime += dt * this._settings.speed;
    if (this.time >= this.duration && this._settings.loop) {
      this.time %= this.duration;
      if (effectById(this.effect).kind === "entrance") this.clearInteraction();
    } else if (this.time >= this.duration) {
      this.time = this.duration;
    }
  }
  get playbackComplete() { return this.time >= this.duration; }
  get acceptsRipples() { return this.interaction === "ripple"; }
  samplePoint(point) {
    return sampleMotion(point, this.effect, this.time, this._settings.intensity);
  }
  pointerResponse(shape, mode) {
    return pointerForce(shape, this.pointer, mode, this._settings.intensity, this.effect);
  }
  rippleResponse(shape) {
    return rippleForce(shape, this.ripples, this._interactionTime, this._settings.intensity);
  }
  get effect() {
    return this._settings.effect;
  }
  get duration() {
    return effectById(this.effect).duration;
  }
  get interaction() {
    return this._settings.interaction === "auto"
      ? effectById(this.effect).interaction
      : this._settings.interaction;
  }
  get settings() {
    return { ...this._settings };
  }
  configure(settings) {
    const next = normalizeSettings(settings);
    for (const [key, value] of Object.entries(next))
      if (this.getAttribute(key) !== String(value))
        this.setAttribute(key, String(value));
  }
  async reload() {
    this.statusElement.hidden = false;
    this.statusElement.textContent = "正在唤醒点阵…";
    try {
      this.points = await loadLogoPoints();
      if (!this.isConnected) return;
      this.clearInteraction();
      this.statusElement.hidden = true;
      this.dataset.ready = "true";
      this.resize();
      this.seek(
        this._reduced.matches
          ? this.duration
          : Number(this.getAttribute("sample-time") || 0),
      );
      this.dispatchEvent(
        new CustomEvent("motion-ready", {
          detail: { count: this.points.length },
        }),
      );
      if (this.hasAttribute("autoplay") && !this._reduced.matches) this.play();
    } catch (error) {
      this.statusElement.textContent = "点阵暂时没有载入，请重试。";
      this.dispatchEvent(
        new CustomEvent("motion-error", { detail: { message: error.message } }),
      );
    }
  }
  resize() {
    const rect = this.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.height * ratio);
    const scale = Math.min(rect.width / WIDTH, rect.height / HEIGHT);
    this._size = {
      width: rect.width,
      height: rect.height,
      ratio,
      scale,
      left: (rect.width - WIDTH * scale) / 2,
      top: (rect.height - HEIGHT * scale) / 2,
    };
    this.render(0);
  }
  _pointerMove(event) {
    if (this.hasAttribute("passive") || this.interaction === "off") return;
    clearTimeout(this._touchRelease);
    this._touchRelease = null;
    const rect = this.getBoundingClientRect(),
      size = this._size;
    this.pointer.x = (event.clientX - rect.left - size.left) / size.scale;
    this.pointer.y = (event.clientY - rect.top - size.top) / size.scale;
    this.pointer.active = true;
    this.pointer.targetWeight = 1;
  }
  releasePointer() {
    clearTimeout(this._touchRelease);
    this._touchRelease = null;
    this.pointer.targetWeight = 0;
  }
  clearInteraction() {
    clearTimeout(this._touchRelease);
    this._touchRelease = null;
    this.offsets = this.points.map(() => [0, 0, 0, 0]);
    this.ripples = [];
    this.pointer.active = false;
    this.pointer.weight = 0;
    this.pointer.targetWeight = 0;
  }
  play({ restart = false } = {}) {
    if (!this.points.length) return;
    if (restart || this.playbackComplete) this.seek(0);
    if (this.playing) return;
    this.playing = true;
    this._last = null;
    this._frame = requestAnimationFrame(this._drawLoop);
    this.dispatchEvent(new CustomEvent("motion-play"));
  }
  pause() {
    this.playing = false;
    if (this._frame !== null) cancelAnimationFrame(this._frame);
    this._frame = null;
    this._last = null;
    this.dispatchEvent(new CustomEvent("motion-pause"));
  }
  seek(time) {
    this.time = clamp(Number.isFinite(time) ? time : 0, 0, this.duration);
    this._interactionTime = this.time;
    this.clearInteraction();
    this.render(0);
    this.dispatchEvent(new CustomEvent("motion-seek"));
  }
  sync(time, dt, playing = true) {
    const nextTime = this._settings.loop
      ? time % this.duration
      : Math.min(time, this.duration);
    if (nextTime < this.time && effectById(this.effect).kind === "entrance")
      this.clearInteraction();
    this.time = nextTime;
    this._externallyPlaying = playing;
    this._interactionTime += dt * this._settings.speed;
    this.render(dt);
  }
  /** Useful for hover previews; this is never injected into the main study. */
  demoPointer(active) {
    this.pointer = {
      x: 565,
      y: 320,
      active,
      weight: active ? 1 : 0,
      targetWeight: active ? 1 : 0,
    };
    if (active && this.interaction === "ripple")
      this.ripples = [
        { x: 510, y: 320, time: Math.max(0, this._interactionTime - 0.5) },
      ];
    this.render(active ? 0.05 : 0);
  }
  render(dt = 0) {
    const ctx = this.context,
      size = this._size;
    if (!ctx || !this.points.length) return;
    // Once an entrance settles, keep the input clock alive without repainting
    // an unchanged canvas. Pointer activity resumes painting on the next frame.
    if (
      dt > 0 &&
      this.time >= this.duration &&
      this._renderedTime === this.time &&
      !this._settings.loop &&
      !this.pointer.active &&
      !this.ripples.length &&
      this.offsets.every((offset) =>
        offset.every((value) => Math.abs(value) < 0.001),
      )
    )
      return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(
      size.ratio * size.scale,
      0,
      0,
      size.ratio * size.scale,
      size.left * size.ratio,
      size.top * size.ratio,
    );
    ctx.fillStyle = INK;
    const mode =
      this.hasAttribute("passive") && !this.pointer.active
        ? "off"
        : this.interaction;
    this.pointer.weight +=
      (this.pointer.targetWeight - this.pointer.weight) *
      (1 - Math.exp(-dt * 9));
    if (this.pointer.weight < 0.001 && !this.pointer.targetWeight)
      this.pointer.active = false;
    this.ripples = this.ripples.filter(
      (ripple) => this._interactionTime - ripple.time < 3.2,
    );
    const entrance = effectById(this.effect).kind === "entrance";
    const fade =
      this._settings.loop && entrance
        ? 1 - clamp((this.time - this.duration + 0.55) / 0.55)
        : 1;
    this._snapshot = [];
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i],
        shape = this.samplePoint(point);
      const force = this.pointerResponse(shape, mode);
      const ripple = mode === "off" ? [0, 0, 1] : this.rippleResponse(shape);
      const offset = this.offsets[i];
      [offset[0], offset[2]] = spring(
        offset[0],
        offset[2],
        force[0],
        dt,
        this.effect === "scatter" ? 8 : 11,
      );
      [offset[1], offset[3]] = spring(
        offset[1],
        offset[3],
        force[1],
        dt,
        this.effect === "scatter" ? 8 : 11,
      );
      const x = shape.x + offset[0] + ripple[0],
        y = shape.y + offset[1] + ripple[1],
        radius = Math.max(0.01, shape.r * force[2] * ripple[2]);
      this._snapshot.push([x, y, radius, shape.opacity * fade]);
      if (shape.opacity < 0.005 || radius < 0.02) continue;
      ctx.globalAlpha = shape.opacity * fade;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this._renderedTime = this.time;
  }
  getFrame() {
    return (this._snapshot || []).map((point) => [...point]);
  }
}
if (!customElements.get("hiddenmoss-motion"))
  customElements.define("hiddenmoss-motion", HiddenMossMotion);
