# Personal portfolio

A responsive static website served by GitHub Pages from `master`. No build step, framework, or runtime dependency is required. Project pages keep their original URLs, and `CNAME` retains the custom domain.

## Local preview

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765/>. The site uses self-hosted DM Sans and Instrument Serif fonts; their original license files are in `assets/fonts/`.

## Checks

Node.js 20 or newer is required for development checks only:

```sh
npm ci
npx playwright install chromium
npm test
npm run format:check
```

The browser check starts its own loopback-only server, checks the homepage at 320, 390, 768, 1024, and 1440 pixels, tests filters and sticky navigation, checks all project pages for broken local links and images, and runs automated WCAG A/AA scans. It also checks the no-JavaScript fallback and reduced-motion setting. Screenshots and the accessibility report go to the ignored `test-results/` directory. Automated scans supplement, not replace, human accessibility review.

## Content

This UI refresh preserves the original project archive and early experience. Student-era biography claims are not presented as current employment. The old résumé is explicitly labeled as archived; LinkedIn is the route to current background and contact. The original calendar demo is retained as a clearly labeled historical link, and its availability is not guaranteed.

The homepage keeps the legacy `intro-page`, `about-me`, `experience`, and `cs-projects` anchors. Project filters are progressively enhanced: all work remains visible if JavaScript is unavailable. Previous `cs-projects/style2.css` and `style3.css` files remain available for compatibility but are no longer loaded by the refreshed pages.

Preview changes in a pull request before merging: updates to `master` publish the live website.
