// Progressive enhancement: content, navigation, and image links work without JavaScript.
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
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
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
if (header || sections.length) {
  window.addEventListener("scroll", queueNavigation, { passive: true });
  window.addEventListener("hashchange", queueNavigation);
  window.addEventListener("pageshow", updateHeaderOffset);
  queueNavigation();
}

// Native dialog keeps keyboard focus inside the viewer and supports Escape.
// Original image URLs remain ordinary links, including modified clicks and no-JS.
if (
  typeof HTMLDialogElement !== "undefined" &&
  typeof HTMLDialogElement.prototype.showModal === "function" &&
  document.querySelector("[data-image-viewer]")
) {
  let viewer;
  let returnFocus;
  function createViewer() {
    const dialog = document.createElement("dialog");
    dialog.className = "image-viewer";
    dialog.setAttribute("aria-labelledby", "image-viewer-title");
    dialog.innerHTML = `
      <div class="image-viewer-toolbar">
        <h2 id="image-viewer-title"></h2>
        <button class="viewer-close" type="button" autofocus>
          Close <span aria-hidden="true">×</span>
        </button>
      </div>
      <div class="image-viewer-frame" tabindex="0" role="region" aria-label="Image preview. Use arrow keys to pan when zoomed.">
        <img alt="" decoding="async" />
      </div>
      <p class="image-viewer-status" role="status"></p>
      <div class="image-viewer-actions">
        <button class="viewer-zoom" type="button" aria-pressed="false">Zoom in</button>
        <a class="text-link viewer-original">Open original <span aria-hidden="true">↗</span></a>
      </div>`;
    document.body.append(dialog);
    const close = dialog.querySelector(".viewer-close");
    const zoom = dialog.querySelector(".viewer-zoom");
    const image = dialog.querySelector("img");
    const status = dialog.querySelector(".image-viewer-status");
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const controls = [
        ...dialog.querySelectorAll(
          'button:not(:disabled), a[href], [tabindex="0"]',
        ),
      ];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    zoom.addEventListener("click", () => {
      const zoomed = dialog.classList.toggle("is-zoomed");
      zoom.setAttribute("aria-pressed", String(zoomed));
      zoom.textContent = zoomed ? "Fit image" : "Zoom in";
      dialog.querySelector(".image-viewer-frame").scrollTo(0, 0);
    });
    image.addEventListener("load", () => {
      status.textContent = "";
      image.hidden = false;
      zoom.disabled = false;
    });
    image.addEventListener("error", () => {
      status.textContent =
        "This image couldn’t load. Open the original image instead.";
      image.hidden = true;
      zoom.disabled = true;
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (dialog.open) return;
      document.documentElement.classList.remove("image-viewer-open");
      returnFocus?.focus({ preventScroll: true });
    });
    return dialog;
  }
  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    )
      return;
    const link = event.target.closest("a[data-image-viewer]");
    const source = link?.querySelector("img");
    if (!source) return;
    viewer ??= createViewer();
    const image = viewer.querySelector("img");
    const title = viewer.querySelector("#image-viewer-title");
    const zoom = viewer.querySelector(".viewer-zoom");
    title.textContent = source.alt;
    title.title = source.alt;
    viewer.querySelector(".viewer-original").href = link.href;
    viewer.querySelector(".image-viewer-status").textContent = "Loading image…";
    viewer.classList.remove("is-zoomed");
    zoom.setAttribute("aria-pressed", "false");
    zoom.textContent = "Zoom in";
    zoom.disabled = true;
    image.hidden = true;
    image.alt = source.alt;
    image.width = Number(source.getAttribute("width")) || source.naturalWidth;
    image.height =
      Number(source.getAttribute("height")) || source.naturalHeight;
    image.src = link.href;
    if (image.complete && image.naturalWidth) {
      image.hidden = false;
      zoom.disabled = false;
      viewer.querySelector(".image-viewer-status").textContent = "";
    }
    // A failed dialog launch must leave the native image link usable.
    try {
      viewer.showModal();
    } catch {
      return;
    }
    event.preventDefault();
    returnFocus = link;
    document.documentElement.classList.add("image-viewer-open");
    viewer.querySelector(".image-viewer-frame").scrollTo(0, 0);
    viewer.querySelector(".viewer-close").focus({ preventScroll: true });
  });
}
