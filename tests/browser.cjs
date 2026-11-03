const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
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
  assert.equal(
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, "assets/resume.pdf")))
      .digest("hex"),
    "2de32fb1bbefcabb93bcab9b1970df039fbe8a247e0bc1a0b02f286aa10e910f",
    "Résumé must match the supplied PDF",
  );
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
      assert.equal(
        await page.locator(".about-section,.hero-summary").count(),
        0,
      );
      assert.equal(await page.locator("#about-me.bio-section").count(), 1);
      assert.equal(await page.locator("#about-me h2").innerText(), "About");
      assert.match(
        await page.locator("#about-me .professional-bio").innerText(),
        /software engineer at Meta.*Applied AI.*privacy infrastructure.*VR/s,
      );
      assert(
        (
          await page.locator("#about-me .professional-bio").innerText()
        ).includes(
          "Previously, I worked on privacy infrastructure and VR systems.",
        ),
      );
      assert.equal(
        await page.locator("#about-me .media-intro").innerText(),
        "I’m Gen Z, so naturally I track all the media I consume. You can see what I’ve been reading and watching here:",
      );
      assert.equal(
        await page.locator("#about-me .personal-bio").innerText(),
        "I’m based in Brooklyn and interested in public transit and urbanism. I play ultimate frisbee, padel, and volleyball, and I love building things.",
      );
      assert.equal(
        await page.locator('.nav-links a[href="#about-me"]').count(),
        1,
      );
      assert.equal(await page.locator(".project-card").count(), 6);
      assert.equal(
        await page
          .locator(
            'a[href="cs-projects/chat-room.html"],a[href="cs-projects/js-calendar.html"],a[href="cs-projects/file-sharing.html"]',
          )
          .count(),
        0,
      );
      assert.equal(
        await page.locator(".project-card").first().locator("h3").innerText(),
        "Pulse",
      );
      assert.equal(
        await page
          .locator(".project-card")
          .first()
          .locator("a")
          .getAttribute("href"),
        "https://apps.apple.com/us/app/pulse-map-nyc-event-discover/id6760617130",
      );
      assert.equal(
        await page.locator(".project-card").nth(1).locator("h3").innerText(),
        "NextMove",
      );
      assert.equal(
        await page
          .locator(".project-card")
          .nth(1)
          .locator("a")
          .getAttribute("href"),
        "cs-projects/nextmove.html",
      );
      for (const [label, url] of [
        ["Goodreads", "https://www.goodreads.com/user/show/2754883-kalli"],
        ["Letterboxd", "https://letterboxd.com/kalissaa/"],
      ]) {
        const link = page
          .locator("#about-me")
          .getByRole("link", { name: new RegExp("^" + label) });
        assert.equal(await link.getAttribute("href"), url);
        assert.equal(await link.getAttribute("target"), "_blank");
        assert((await link.getAttribute("rel")).includes("noopener"));
      }
      assert(
        !(await page.locator("body").innerText())
          .toLowerCase()
          .includes("vibe"),
      );
      assert.equal(
        await page.locator('a[href="assets/resume.pdf"]').count(),
        2,
      );
      assert.equal(
        await page.locator("#experience h2").innerText(),
        "Earlier experience",
      );
      assert.equal(
        await page.locator("#experience .experience-row").count(),
        3,
      );
      assert.deepEqual(await page.locator("#experience h3").allTextContents(), [
        "Driver Technologies",
        "J.P. Morgan Chase",
        "Girls Who Code",
      ]);
      assert.deepEqual(
        await page.locator("#experience .experience-date").allTextContents(),
        ["Jan–Dec 2021", "Jun–Aug 2019", "Jun–Aug 2018"],
      );
      assert.equal(await page.locator("#experience .tags").count(), 0);
      assert.equal(
        (await page.locator(".hero .eyebrow").textContent()).trim(),
        "Engineering & building",
      );
      for (const [filter, expected] of [
        ["Engineering", 4],
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
          const atEnd =
            scrollY >= document.documentElement.scrollHeight - innerHeight - 2;
          const headingBottom = document
            .querySelector(`${selector} h2`)
            .getBoundingClientRect().bottom;
          return (
            top >= height - 2 &&
            (top < height + 150 || (atEnd && headingBottom <= innerHeight))
          );
        }, target);
      }
      assert.deepEqual(errors, []);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      report.push({ page: "home", width, violations: result.violations });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.locator("img").evaluateAll((images) =>
        images.forEach((image) => {
          image.loading = "eager";
        }),
      );
      await page.waitForFunction(() =>
        [...document.images].every((image) => image.complete),
      );
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
      assert.equal(
        await page.locator('a[href$="#about-me"]').count(),
        route ? 0 : 1,
      );
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
        )
          assert(
            (await response.text()).includes(`id="${url.hash.slice(1)}"`),
            `Missing fragment ${url}`,
          );
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
      "PASS: 5 responsive widths, 7 pages, 6 projects, removed bio/projects, Meta section, supplied résumé, filters, links/images, no-JS, reduced motion, and automated WCAG A/AA checks.",
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
