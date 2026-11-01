import { HiddenMossIdentity } from "../motion/identity.mjs";
import { loadLogoPoints } from "../motion/logo.mjs";
import { createField, fieldLayout } from "./geometry.mjs";
import { sampleField } from "./profile.mjs";

/** Full-screen geometry; all animation and interaction stay in the identity component. */
class HiddenMossField extends HiddenMossIdentity {
  async reload() {
    try {
      this.source = await loadLogoPoints();
      if (!this.isConnected) return;
      this.resize();
      this.statusElement.hidden = true;
      this.dataset.ready = "true";
      this.setAttribute("aria-label", "Hiddenmoss logo with a breathing dot background. Move to attract dots; click for ripples.");
      this.seek(this._reduced.matches ? this.duration : 0);
      this.dispatchEvent(new CustomEvent("motion-ready"));
      if (this.hasAttribute("autoplay") && !this._reduced.matches) this.play();
    } catch (error) {
      this.statusElement.hidden = false;
      this.statusElement.textContent = "The dot field could not load. Please refresh to try again.";
      this.dispatchEvent(new CustomEvent("motion-error", { detail: { message: error.message } }));
    }
  }
  resize() {
    const { width, height } = this.getBoundingClientRect();
    if (!width || !height || !this.source) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (this._size.width === width && this._size.height === height && this._size.ratio === ratio && this.points.length) return;
    this._size = { ...fieldLayout(width, height), ratio };
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    const previous = new Map(this.points.map((p, i) => [p.key, this.offsets[i]]));
    this.points = createField(this.source, this._size);
    this.offsets = this.points.map(point => previous.get(point.key) || [0, 0, 0, 0]);
    this.dataset.count = String(this.points.length);
    this.render(0);
  }
  samplePoint(point) {
    return sampleField(point, this.time, this.radiusGain || 1);
  }
}
customElements.define("hiddenmoss-field", HiddenMossField);

