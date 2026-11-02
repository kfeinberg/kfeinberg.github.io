const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "test-results");
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url, "http://localhost").pathname,
  );
  const filename = path.resolve(
    root,
    "." + (pathname === "/" ? "/index.html" : pathname),
  );
  if (!filename.startsWith(root + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  fs.readFile(filename, (error, bytes) => {
    if (error) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Content-Type":
        types[path.extname(filename)] || "application/octet-stream",
    });
    response.end(bytes);
  });
});

async function verify() {
  fs.mkdirSync(output, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const report = [];
  try {
    for (const width of [320, 390, 768, 1024, 1440]) {
      const page = await context.newPage();
      await page.setViewportSize({ width, height: 1000 });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Homepage overflow at ${width}`,
      );
      for (const [filter, expected] of [
        ["Code", 4],
        ["Design & writing", 2],
        ["All work", 6],
      ]) {
        const button = page.getByRole("button", {
          name: new RegExp("^" + filter),
        });
        await button.click();
        assert.equal(
          await page.locator(".project-card:visible").count(),
          expected,
        );
        assert.equal(await button.getAttribute("aria-pressed"), "true");
        assert.equal(
          await page.locator(".project-count").innerText(),
          `${expected} projects`,
        );
      }
      for (const target of ["#cs-projects", "#about-me", "#experience"]) {
        await page.locator(`.nav-links a[href="${target}"]`).click();
        await page.waitForFunction((selector) => {
          const top = document
            .querySelector(selector)
            .getBoundingClientRect().top;
          const height = document
            .querySelector(".site-header")
            .getBoundingClientRect().height;
          return top >= height - 2 && top < height + 150;
        }, target);
      }
      assert.deepEqual(errors, []);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      report.push({ page: "home", width, violations: result.violations });
      await page.goto(origin, { waitUntil: "networkidle" });
      if (width === 1440 || width === 390) {
        await page.screenshot({
          path: path.join(output, `home-${width}.png`),
          fullPage: true,
        });
        await page.screenshot({ path: path.join(output, `hero-${width}.png`) });
      }
      await page.close();
    }
    const routes = [
      "",
      "chat-room",
      "word-catcher",
      "design",
      "js-calendar",
      "smart-guesser",
      "file-sharing",
    ];
    for (const route of routes) {
      const page = await context.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(origin + (route ? `/cs-projects/${route}.html` : "/"), {
        waitUntil: "networkidle",
      });
      await page.locator("img").evaluateAll((images) =>
        images.forEach((image) => {
          image.loading = "eager";
        }),
      );
      await page.waitForFunction(() =>
        [...document.images].every((image) => image.complete),
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow on ${route}`,
      );
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.locator("main").count(), 1);
      const broken = await page
        .locator("img")
        .evaluateAll((images) =>
          images
            .filter((image) => !image.naturalWidth || !image.alt)
            .map((image) => image.src),
        );
      assert.deepEqual(broken, [], `Broken or unnamed images on ${route}`);
      const links = await page.locator("a[href]").evaluateAll((anchors) =>
        anchors.map((anchor) => ({
          href: anchor.href,
          target: anchor.target,
          rel: anchor.rel,
        })),
      );
      for (const link of links) {
        if (link.target === "_blank") assert(link.rel.includes("noopener"));
        const url = new URL(link.href);
        if (url.origin !== origin) continue;
        const response = await page.request.get(url.origin + url.pathname);
        assert(response.ok(), `Broken local link ${url}`);
        if (
          url.hash &&
          response.headers()["content-type"]?.includes("text/html")
        ) {
          assert(
            (await response.text()).includes(`id="${url.hash.slice(1)}"`),
            `Missing fragment ${url}`,
          );
        }
      }
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      report.push({
        page: route || "home",
        width: 390,
        violations: result.violations,
      });
      await page.close();
    }
    const noJS = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 844 },
    });
    const plain = await noJS.newPage();
    await plain.goto(origin);
    assert.equal(await plain.locator(".project-card:visible").count(), 6);
    assert.equal(await plain.locator(".work-toolbar:visible").count(), 0);
    await noJS.close();
    const reduced = await browser.newContext({ reducedMotion: "reduce" });
    const motion = await reduced.newPage();
    await motion.goto(origin);
    assert.equal(
      await motion.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
      "auto",
    );
    await reduced.close();
    fs.writeFileSync(
      path.join(output, "accessibility.json"),
      JSON.stringify(report, null, 2),
    );
    assert(
      report.every((result) => result.violations.length === 0),
      "Accessibility violations: see test-results/accessibility.json",
    );
    console.log(
      "PASS: 5 responsive widths, 7 pages, filters, anchors, local links/images, no-JS, reduced motion, and automated WCAG A/AA checks.",
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
verify().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
