import { HiddenMossMotion } from "./logo.mjs";
import { ENTRANCE_END, sampleIdentity, identityAttraction, identityRipple } from "./identity-profile.mjs";

/** One entrance followed by continuous breathing, attraction and click ripples. */
export class HiddenMossIdentity extends HiddenMossMotion {
  connectedCallback() {
    this.configure({ effect: "breathe", speed: 1, intensity: 1.8, interaction: "attract", loop: true });
    super.connectedCallback();
    this.setAttribute("aria-label", "Hiddenmoss");
    this.statusElement.textContent = "";
  }
  get duration() { return ENTRANCE_END; }
  get playbackComplete() { return false; }
  get acceptsRipples() { return true; }
  advanceClock(dt) {
    this.time += dt;
    this._interactionTime += dt;
  }
  samplePoint(point) { return sampleIdentity(point, this.time); }
  pointerResponse(shape, mode) { return identityAttraction(shape, this.pointer, mode); }
  rippleResponse(shape) { return identityRipple(shape, this.ripples, this._interactionTime); }
}

if (!customElements.get("hiddenmoss-identity"))
  customElements.define("hiddenmoss-identity", HiddenMossIdentity);
