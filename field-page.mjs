const mark = document.querySelector("hiddenmoss-field");
// Approved field preview uses 3.3× background dots; logo radii stay original.
mark.radiusGain = 3.3;
const fallback = () => {
  clearTimeout(window.logoLoadTimeout);
  document.documentElement.classList.add("fallback");
  mark.pause?.();
};
mark.addEventListener("motion-ready", () => {
  clearTimeout(window.logoLoadTimeout);
  document.documentElement.classList.remove("fallback");
});
mark.addEventListener("motion-error", fallback);
import("./field/field.mjs").catch(fallback);
