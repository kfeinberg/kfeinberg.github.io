const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const http = require("node:http");
const root = path.resolve(__dirname, "..");
const source = fs
  .readFileSync(path.join(root, "cs-projects/nextmove.html"), "utf8")
  .replace(/\s+/g, " ");
assert(source.includes("Muse"));
assert(source.includes("email every day"));
assert(source.includes("structured data"));
assert(source.includes("dashboard"));
assert(source.includes("The app is private."));
assert(!/mailto:|internalfb|internalmeta|gmail\.com/.test(source));
const server = http.createServer((request, response) => {
  const file = path.resolve(
    root,
    "." + new URL(request.url, "http://localhost").pathname,
  );
  if (!file.startsWith(root + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  fs.readFile(file, (error, bytes) => {
    response.writeHead(error ? 404 : 200, {
      "Content-Type": file.endsWith(".css")
        ? "text/css"
        : file.endsWith(".woff2")
          ? "font/woff2"
          : "text/html",
    });
    response.end(error ? "" : bytes);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    for (const width of [320, 390, 1440]) {
      const page = await context.newPage();
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `http://127.0.0.1:${server.address().port}/cs-projects/nextmove.html`,
        { waitUntil: "networkidle" },
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.equal(
        await page.getByRole("heading", { level: 1 }).innerText(),
        "NextMove",
      );
      assert.equal(await page.locator(".workflow-steps li").count(), 3);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(scan.violations, []);
      await page.close();
    }
    console.log(
      "PASS: NextMove workflow content, privacy guard, 3 widths, and automated WCAG A/AA checks.",
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
