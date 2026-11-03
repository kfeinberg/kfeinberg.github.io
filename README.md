# Personal portfolio

A responsive static website served by GitHub Pages from `master`. No build step, framework, or runtime dependency is required. `CNAME` retains the custom domain.

## Local preview

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765/>. DM Sans is self-hosted; its license is in `assets/fonts/`.

## Checks

Node.js 20 or newer is required for development checks only:

```sh
npm ci
npx playwright install chromium
npm test
npm run format:check
```

The tests start a loopback-only server and check five viewport widths, all seven HTML pages, navigation, filters, local links/images, the supplied résumé, the Meta section, and the removal of the bio and retired project links. They also verify the Pulse App Store link and that NextMove has no outbound app link. Automated WCAG A/AA scans, no-JavaScript fallback, and reduced motion are checked. Evidence is written to the ignored `test-results/` directory. Automated scans do not replace human accessibility review.

## Content

The old biography is replaced with the owner’s supplied details: Brooklyn, public transit and urbanism, ultimate frisbee/padel/volleyball, and enjoying building things. The homepage lists six projects, led by Pulse and NextMove. Pulse uses its public App Store listing and icon. NextMove is described as a vibe-coded personal tool; no private data, screenshots, or app URL are exposed. Chatroom, calendar, and PHP file sharing are removed from project navigation; their old detail URLs remain available for compatibility.

The Meta section summarizes Applied AI, privacy infrastructure, and VR work. Role history and earlier accomplishments are grounded in the owner-supplied résumé; recent Applied AI focus areas are informed by work history. Internal task/diff identifiers, implementation details, and internal operational metrics are not included in the webpage. The résumé is the PDF supplied by the owner, unchanged.

The `intro-page`, `about-me`, `experience`, and `cs-projects` anchors are retained. The About section contains only the newly supplied biography. All six projects remain visible without JavaScript. Previous `cs-projects/style2.css` and `style3.css` files remain available but are not loaded by the refreshed pages.

Updates to `master` publish the live site. Review the branch before merging.
