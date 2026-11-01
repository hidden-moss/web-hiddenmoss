const mark = document.querySelector("hiddenmoss-identity");
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
import("./motion/identity.mjs").catch(fallback);
