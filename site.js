// Progressive enhancement: all projects and navigation work without JavaScript.
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
      filters.forEach((button) => {
        button.setAttribute("aria-pressed", String(button === filter));
      });
      count.textContent = `${visible} ${visible === 1 ? "project" : "projects"}`;
    });
  });
}
