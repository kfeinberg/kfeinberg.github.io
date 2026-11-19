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
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const filename = path.resolve(
    root,
    "." + (pathname === "/" ? "/index.html" : pathname),
  );
  if (!filename.startsWith(root + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  fs.readFile(filename, (error, bytes) => {
    response.writeHead(error ? 404 : 200, {
      "Content-Type":
        types[path.extname(filename)] || "application/octet-stream",
    });
    response.end(error ? "" : bytes);
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
    const home = await context.newPage();
    await home.goto(origin);
    const actions = await home.locator(".project-cta").allTextContents();
    assert.equal(actions.length, 5);
    assert.equal(
      actions.filter((text) => text.includes("View project")).length,
      4,
    );
    assert(actions.at(-1).includes("Read paper (PDF)"));
    for (const name of [
      "Pulse View on the App Store",
      "NextMove View project",
      "Word Catcher View project",
      "Design work View project",
      "Mastermind solver View project",
      "The Turing Test Read paper (PDF)",
    ]) {
      assert.equal(
        await home.getByRole("link", { name }).count(),
        1,
        `Clear link name: ${name}`,
      );
    }
    assert.equal(
      (await home.locator('.navigation a[href="#contact"]').innerText()).trim(),
      "Contact",
    );
    await home.keyboard.press("Tab");
    await home.locator(".contact-top .button").focus();
    assert.equal(
      await home
        .locator(".contact-top .button")
        .evaluate((link) => getComputedStyle(link).outlineColor),
      "rgb(255, 210, 63)",
    );
    await home.locator(".project-card--feature .project-link").focus();
    assert(
      (
        await home
          .locator(".project-card--feature h3")
          .evaluate((heading) => getComputedStyle(heading).textDecorationLine)
      ).includes("underline"),
    );
    await home.close();

    const routes = [
      "word-catcher",
      "design",
      "smart-guesser",
      "chat-room",
      "js-calendar",
      "file-sharing",
      "nextmove",
    ];
    for (const route of routes) {
      const page = await context.newPage();
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(`${origin}/cs-projects/${route}.html`, {
        waitUntil: "networkidle",
      });
      const targets = await page.locator(".navigation a").evaluateAll((links) =>
        links.map((link) => ({
          text: link.innerText,
          width: link.getBoundingClientRect().width,
          height: link.getBoundingClientRect().height,
        })),
      );
      assert.equal(targets.length, 4);
      assert(
        targets.every(
          (target) =>
            target.width >= 44 && target.height >= 44 && target.height < 46,
        ),
        `Single-line 44px navigation on ${route}: ${JSON.stringify(targets)}`,
      );
      assert.equal(
        await page.locator('.navigation a[aria-current="true"]').innerText(),
        "Projects",
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const dimensions = await page.locator("main img").evaluateAll((images) =>
        images.map((image) => ({
          src: image.getAttribute("src"),
          width: Number(image.getAttribute("width")),
          height: Number(image.getAttribute("height")),
        })),
      );
      assert(
        dimensions.every((image) => image.width > 0 && image.height > 0),
        `Reserved image space on ${route}`,
      );
      const trigger = page.locator("a[data-image-viewer]").first();
      await trigger.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      await trigger.focus();
      const scrollBefore = await page.evaluate(() => scrollY);
      const original = await trigger.getAttribute("href");
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible" });
      await page.waitForFunction(() => {
        const image = document.querySelector(".image-viewer img");
        return !image.hidden && image.complete && image.naturalWidth > 0;
      });
      assert.equal(
        await page
          .locator(".viewer-close")
          .evaluate((button) => button === document.activeElement),
        true,
      );
      assert.equal(
        await dialog.locator(".viewer-original").getAttribute("href"),
        new URL(original, page.url()).href,
      );
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.classList.contains("image-viewer-open"),
        ),
        true,
      );
      const fit = await dialog.locator("img").boundingBox();
      const frame = await dialog.locator(".image-viewer-frame").boundingBox();
      assert(fit.width <= frame.width + 1 && fit.height <= frame.height + 1);
      await dialog.getByRole("button", { name: "Zoom in" }).click();
      assert.equal(
        await dialog
          .getByRole("button", { name: "Fit image" })
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(
        await dialog
          .locator("img")
          .evaluate(
            (image) =>
              Math.round(image.getBoundingClientRect().width) ===
              image.naturalWidth,
          ),
        true,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Zoom scroll stays inside the viewer",
      );
      await dialog.getByRole("button", { name: "Fit image" }).click();
      // Native dialog tab order must not escape to the page underneath it.
      await dialog.getByRole("button", { name: "Close" }).focus();
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab");
        assert(
          await page.evaluate(() => !!document.activeElement.closest("dialog")),
        );
      }
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      report.push({ route, width: 320, viewerViolations: scan.violations });
      assert.deepEqual(
        scan.violations,
        [],
        `Accessible open viewer on ${route}`,
      );
      if (["design", "nextmove"].includes(route))
        await page.screenshot({
          path: path.join(output, `viewer-${route}-320.png`),
        });
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await page.waitForFunction(
        () => !document.documentElement.classList.contains("image-viewer-open"),
      );
      assert.equal(
        await trigger.evaluate((link) => link === document.activeElement),
        true,
      );
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.classList.contains("image-viewer-open"),
        ),
        false,
      );
      assert(
        Math.abs((await page.evaluate(() => scrollY)) - scrollBefore) <= 2,
        "Closing preserves reading position",
      );
      // Reopening an already cached image must settle, too.
      await trigger.click();
      await dialog.waitFor({ state: "visible" });
      await page.waitForFunction(
        () => !document.querySelector(".image-viewer img").hidden,
      );
      await dialog.getByRole("button", { name: "Close" }).click();
      await dialog.waitFor({ state: "hidden" });
      await trigger.click();
      await dialog.waitFor({ state: "visible" });
      await page.mouse.click(1, 1);
      await dialog.waitFor({ state: "hidden" });
      assert.equal(
        await trigger.evaluate((link) => link === document.activeElement),
        true,
      );
      // Modified clicks retain the native browser action rather than opening a dialog.
      assert.equal(
        await trigger.evaluate((link) =>
          link.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              ctrlKey: true,
              button: 0,
            }),
          ),
        ),
        true,
      );
      assert.equal(await page.locator("dialog[open]").count(), 0);
      await page.close();
    }
    const plain = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 568 },
    });
    const noJS = await plain.newPage();
    await noJS.goto(`${origin}/cs-projects/design.html`);
    const nativeLink = noJS.locator("[data-image-viewer]").first();
    const imagePath = await nativeLink.getAttribute("href");
    await nativeLink.click();
    assert.equal(
      new URL(noJS.url()).pathname,
      new URL(imagePath, `${origin}/cs-projects/design.html`).pathname,
    );
    await plain.close();
    const failure = await context.newPage();
    await failure.goto(`${origin}/cs-projects/word-catcher.html`);
    await failure.route("**/missing-image.png", (route) => route.abort());
    await failure.locator("[data-image-viewer]").evaluate((link) => {
      link.href = "../assets/missing-image.png";
    });
    await failure.locator("[data-image-viewer]").click();
    await failure.waitForFunction(() =>
      document
        .querySelector(".image-viewer-status")
        .textContent.includes("couldn’t load"),
    );
    assert.equal(await failure.locator(".viewer-zoom").isDisabled(), true);
    assert.equal(
      await failure.locator(".viewer-original").getAttribute("href"),
      `${origin}/assets/missing-image.png`,
    );
    await failure.keyboard.press("Escape");
    await failure.close();
    fs.writeFileSync(
      path.join(output, "ui-pass.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      "PASS: clear project actions, small-screen detail navigation, image dimensions, 7 accessible image viewers, zoom/pan, Escape/backdrop/close, focus/scroll restoration, modified clicks, no-JS fallback, and image-load failure recovery.",
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
