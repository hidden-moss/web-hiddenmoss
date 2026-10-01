const mark = document.querySelector("hiddenmoss-field");
// Approved field preview uses 3.3× background dots; logo radii stay original.
mark.radiusGain = 3.3;
const toggle = document.querySelector("#motion-toggle");
const fallback = () => {
  clearTimeout(window.logoLoadTimeout);
  document.documentElement.classList.add("fallback");
  mark.pause?.();
  toggle.hidden = true;
};
const update = () => {
  toggle.textContent = mark.playing ? "Pause motion" : "Play motion";
  toggle.setAttribute("aria-label", mark.playing ? "Pause logo animation" : "Play logo animation");
};
mark.addEventListener("motion-ready", () => {
  clearTimeout(window.logoLoadTimeout);
  document.documentElement.classList.remove("fallback");
  toggle.hidden = false;
  update();
});
mark.addEventListener("motion-error", fallback);
mark.addEventListener("motion-play", update);
mark.addEventListener("motion-pause", update);
toggle.addEventListener("click", () => mark.playing ? mark.pause() : mark.play());
import("./field/field.mjs").catch(fallback);
