// Progressive enhancement: content and navigation work without JavaScript.
const header = document.querySelector(".site-header");
const sectionLinks = [
  ...document.querySelectorAll('.navigation .nav-links a[href^="#"]'),
];
const sections = sectionLinks
  .map((link) => ({
    link,
    section:
      document.getElementById(link.hash.slice(1))?.closest("section") ??
      document.getElementById(link.hash.slice(1)),
  }))
  .filter((item) => item.section);
let frame = 0;
function updateNavigation() {
  frame = 0;
  const threshold = (header?.getBoundingClientRect().height ?? 0) + 48;
  let current = null;
  sections.forEach((item) => {
    if (item.section.getBoundingClientRect().top <= threshold) current = item;
  });
  if (
    window.scrollY > 0 &&
    window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 2
  ) {
    const anchored = sections.find(
      (item) => item.link.hash === window.location.hash,
    );
    const heading = anchored?.section
      .querySelector("h1, h2")
      ?.getBoundingClientRect();
    current =
      heading &&
      heading.top >= (header?.getBoundingClientRect().height ?? 0) &&
      heading.bottom <= window.innerHeight
        ? anchored
        : (sections.at(-1) ?? null);
  }
  sections.forEach((item) => {
    if (item === current) item.link.setAttribute("aria-current", "location");
    else item.link.removeAttribute("aria-current");
  });
}
function queueNavigation() {
  if (!frame) frame = requestAnimationFrame(updateNavigation);
}
function updateHeaderOffset() {
  if (header) {
    const height = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty(
      "--header-height",
      `${height}px`,
    );
    document.documentElement.style.setProperty(
      "--header-offset",
      `${height + 24}px`,
    );
  }
  queueNavigation();
}
if (header) {
  updateHeaderOffset();
  if (typeof ResizeObserver !== "undefined")
    new ResizeObserver(updateHeaderOffset).observe(header);
  else window.addEventListener("resize", updateHeaderOffset);
}
if (sections.length) {
  window.addEventListener("scroll", queueNavigation, { passive: true });
  window.addEventListener("hashchange", queueNavigation);
  queueNavigation();
}
