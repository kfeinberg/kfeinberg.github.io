// Progressive enhancement: content and navigation work without JavaScript.
const toolbar = document.querySelector(".work-toolbar");
const filters = document.querySelectorAll("[data-filter]");
const projects = document.querySelectorAll(".project-card[data-category]");
const count = document.querySelector(".project-count");

if (toolbar && filters.length && projects.length && count) {
  toolbar.hidden = false;
  filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      const category = filter.dataset.filter;
      let visible = 0;
      projects.forEach((project) => {
        project.hidden =
          category !== "all" && project.dataset.category !== category;
        if (!project.hidden) visible += 1;
      });
      filters.forEach((button) =>
        button.setAttribute("aria-pressed", String(button === filter)),
      );
      count.textContent = `${visible} ${visible === 1 ? "project" : "projects"}`;
    });
  });
}

const header = document.querySelector(".site-header");
const sectionLinks = [
  ...document.querySelectorAll('.navigation .nav-links a[href^="#"]'),
];
const sections = sectionLinks
  .map((link) => ({
    link,
    section: document.getElementById(link.hash.slice(1)),
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
  if (header)
    document.documentElement.style.setProperty(
      "--header-offset",
      `${Math.ceil(header.getBoundingClientRect().height) + 24}px`,
    );
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
