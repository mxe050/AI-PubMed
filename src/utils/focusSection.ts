export function focusSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  const heading = section.querySelector("h2, h3");
  if (heading instanceof HTMLElement) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
  section.scrollIntoView({
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    block: "start",
  });
}
