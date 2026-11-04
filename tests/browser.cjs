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
      assert.deepEqual(
        await page.evaluate(() => {
          const style = getComputedStyle(document.documentElement);
          return ["--blue", "--orange", "--paper"].map((key) =>
            style.getPropertyValue(key).trim(),
          );
        }),
        ["#2149e6", "#ff8a42", "#faf9f5"],
      );
      assert.equal(
        await page
          .locator(".project-grid")
          .evaluate(
            (element) =>
              getComputedStyle(element).gridTemplateColumns.split(" ").length,
          ),
        1,
      );
      assert(
        parseFloat(
          await page
            .locator(".hero h1")
            .evaluate((element) => getComputedStyle(element).fontSize),
        ) <= 64,
      );
      assert(
        parseFloat(
          await page
            .locator(".hero h1")
            .evaluate((element) => getComputedStyle(element).fontSize),
        ) >= 38,
      );
      assert(
        parseFloat(
          await page
            .locator(".bio-copy p")
            .first()
            .evaluate((element) => getComputedStyle(element).fontSize),
        ) >= 16,
      );
      assert.deepEqual(
        await page
          .locator(".hero-portrait, .project-card, .button")
          .evaluateAll((elements) =>
            elements.map((element) => getComputedStyle(element).boxShadow),
          ),
        await page
          .locator(".hero-portrait, .project-card, .button")
          .evaluateAll((elements) => elements.map(() => "none")),
      );
      assert.equal(
        await page
          .locator(".wordmark")
          .first()
          .evaluate((element) => getComputedStyle(element).backgroundColor),
        "rgba(0, 0, 0, 0)",
      );
      assert.equal(await page.locator(".site-header .wordmark").count(), 0);
      assert.equal(await page.locator("#intro-page .button").count(), 0);
      assert(
        (
          await page
            .locator(".hero h1")
            .evaluate((element) => getComputedStyle(element).fontFamily)
        ).includes("Newsreader"),
      );
      assert(
        (
          await page
            .locator(".professional-bio")
            .evaluate((element) => getComputedStyle(element).fontFamily)
        ).includes("Newsreader"),
      );
      assert.equal(await page.locator(".profile-links a").count(), 2);
      const tapTargets = await page
        .locator(
          ".navigation .nav-links a, .filter-button, .hero-actions a, .personal-links a, .footer-bottom > div > a",
        )
        .evaluateAll((elements) =>
          elements.map((element) => ({
            text: element.textContent.trim(),
            height: element.getBoundingClientRect().height,
          })),
        );
      assert(
        tapTargets.every((target) => target.height >= 44),
        `Small tap target at ${width}: ${JSON.stringify(tapTargets)}`,
      );
      const opening = await page.locator("#intro-page").boundingBox();
      const projectsTop = (await page.locator("#cs-projects").boundingBox()).y;
      assert(
        opening.y + opening.height >= 998,
        "Intro must fill at least the viewport",
      );
      assert(
        projectsTop >= 998,
        "Projects must start below the initial screen",
      );
      assert(
        ["y", "y proximity"].includes(
          await page.evaluate(
            () => getComputedStyle(document.documentElement).scrollSnapType,
          ),
        ),
      );
      assert.equal(
        await page.locator(".scroll-cue").getAttribute("href"),
        "#cs-projects",
      );
      if (width <= 420)
        assert(
          (await page.locator("#about-me .professional-bio").boundingBox()).y <
            650,
          "Mobile intro should not push About below the fold",
        );
      assert.equal(
        await page.locator(".nextmove-preview").getAttribute("src"),
        "assets/nextmove-dashboard.png",
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page
          .locator(".skip-link")
          .evaluate((element) => element === document.activeElement),
        true,
      );
      await page.keyboard.press("Enter");
      assert.equal(new URL(page.url()).hash, "#main");
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
      assert.deepEqual(
        await page
          .locator("main > section")
          .evaluateAll((sections) => sections.map((section) => section.id)),
        ["intro-page", "cs-projects", "experience"],
      );
      assert.deepEqual(
        await page
          .locator(".navigation .nav-links a")
          .evaluateAll((links) =>
            links.map((link) => link.getAttribute("href")),
          ),
        ["#about-me", "#cs-projects", "#experience", "#contact"],
      );
      assert.equal(await page.locator("#intro-page #about-me").count(), 1);
      assert.equal(
        await page.locator("#about-me .opening-heading h1").innerText(),
        "Kalissa Feinberg",
      );
      assert.equal(
        await page.locator("#about-me .hero-portrait img").count(),
        1,
      );
      assert.equal(await page.locator("#about-me h2").count(), 0);
      assert.equal(await page.locator("#intro-page .bio-copy").count(), 1);
      assert.match(
        await page.locator("#about-me .professional-bio").innerText(),
        /software engineer at Meta.*Applied AI.*privacy infrastructure.*VR/s,
      );
      assert.equal(
        await page.locator("#about-me .professional-bio").innerText(),
        "I’m a software engineer at Meta, working on Applied AI. Previously, I worked on privacy infrastructure and VR system software.",
      );
      const references = await page
        .locator(".professional-bio a")
        .evaluateAll((links) =>
          links.map((link) => ({
            text: link.textContent,
            href: link.getAttribute("href"),
            target: link.target,
            rel: link.rel,
          })),
        );
      assert.deepEqual(references, [
        {
          text: "Applied AI",
          href: "https://www.businessinsider.com/meta-ai-new-applied-engineering-team-2026-3",
          target: "_blank",
          rel: "noopener noreferrer",
        },
        {
          text: "privacy infrastructure",
          href: "https://engineering.fb.com/2025/07/23/security/policy-zones-meta-purpose-limitation-batch-processing-systems/",
          target: "_blank",
          rel: "noopener noreferrer",
        },
        {
          text: "VR system software",
          href: "https://www.reddit.com/r/oculus/comments/87grwu/what_is_vr_shell_exactly/",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      ]);
      assert.equal(
        await page.locator("#about-me .media-intro").innerText(),
        "I’m Gen Z, so I must track all of the media that I consume. You can see what I’ve been reading and watching here:",
      );
      assert.equal(
        await page.locator("#about-me .personal-bio").innerText(),
        "I’m based in Brooklyn and interested in how cities work, especially public transit. Outside of work, I play ultimate frisbee, padel, and volleyball, and build things for myself.",
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
      assert(
        (
          await page.locator("#experience .experience-row").first().innerText()
        ).includes("raised its Series A while I was there."),
      );
      assert.equal(
        await page.locator("#experience h2").innerText(),
        "Earlier experience",
      );
      assert.equal(
        await page.locator("#experience .experience-row").count(),
        2,
      );
      assert.equal(
        await page.locator("#experience h3 a").getAttribute("href"),
        "https://drivertechnologies.com/",
      );
      assert.equal(
        await page.locator("#experience h3 a").getAttribute("target"),
        "_blank",
      );
      assert.equal(
        await page.locator("#experience h3 a").getAttribute("rel"),
        "noopener noreferrer",
      );
      assert.deepEqual(
        (await page.locator("#experience h3").allTextContents()).map((text) =>
          text.trim(),
        ),
        ["Driver Technologies", "Girls Who Code"],
      );
      assert.deepEqual(
        await page.locator("#experience .experience-date").allTextContents(),
        ["Jan–Dec 2021", "Jun–Aug 2018"],
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
          const element = document.querySelector(selector);
          const top = (
            element.closest("section") ?? element
          ).getBoundingClientRect().top;
          const height = document
            .querySelector(".site-header")
            .getBoundingClientRect().height;
          const atEnd =
            scrollY >= document.documentElement.scrollHeight - innerHeight - 2;
          const headingBottom = document
            .querySelector(`${selector} h1, ${selector} h2`)
            .getBoundingClientRect().bottom;
          return (
            top >= height - 2 &&
            (top < height + 150 || (atEnd && headingBottom <= innerHeight))
          );
        }, target);
        await page.waitForFunction(
          (selector) =>
            document
              .querySelector(`.navigation a[href="${selector}"]`)
              .getAttribute("aria-current") === "location",
          target,
        );
      }
      const allWork = page.getByRole("button", { name: /^All work/ });
      const engineering = page.getByRole("button", { name: /^Engineering/ });
      await engineering.focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(".project-card:visible").count(), 4);
      await allWork.focus();
      await page.keyboard.press("Space");
      assert.equal(await page.locator(".project-card:visible").count(), 6);
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
      "nextmove",
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
      assert.equal(await page.locator('a[href$="#about-me"]').count(), 1);
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
    const landscape = await browser.newContext({
      viewport: { width: 667, height: 375 },
    });
    const landscapePage = await landscape.newPage();
    await landscapePage.goto(origin, { waitUntil: "networkidle" });
    await landscapePage.locator('.navigation a[href="#about-me"]').click();
    await landscapePage.waitForFunction(() => {
      const heading = document
        .querySelector("#about-me h1")
        .getBoundingClientRect();
      return (
        heading.top >=
          document.querySelector(".site-header").getBoundingClientRect()
            .height && heading.bottom <= innerHeight
      );
    });
    assert(
      await landscapePage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await landscape.close();
    const scrolling = await context.newPage();
    await scrolling.setViewportSize({ width: 1440, height: 900 });
    await scrolling.goto(origin, { waitUntil: "networkidle" });
    await scrolling.mouse.move(1000, 650);
    await scrolling.mouse.wheel(0, 900);
    await scrolling.waitForFunction(() => scrollY > 300);
    await scrolling.waitForTimeout(900);
    const projectPosition = await scrolling
      .locator("#cs-projects")
      .boundingBox();
    assert(projectPosition.y < 250, "Wheel scrolling must reach Projects");
    await scrolling.mouse.wheel(0, 900);
    await scrolling.waitForFunction(() => scrollY > 1100);
    await scrolling.keyboard.press("End");
    await scrolling.waitForFunction(
      () =>
        document.querySelector("#contact").getBoundingClientRect().bottom <=
        innerHeight + 2,
    );
    await scrolling.keyboard.press("Home");
    await scrolling.waitForFunction(() => scrollY <= 2);
    await scrolling.locator(".scroll-cue").click();
    await scrolling.waitForFunction(
      () => location.hash === "#cs-projects" && scrollY > 300,
    );
    await scrolling.close();
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
    assert.equal(
      await motion.evaluate(
        () => getComputedStyle(document.documentElement).scrollSnapType,
      ),
      "none",
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
      "PASS: responsive/landscape layouts, 8 pages, 6 projects, keyboard controls, tap targets, active navigation, About/history, supplied résumé, links/images, no-JS, reduced motion, and automated WCAG A/AA checks.",
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
