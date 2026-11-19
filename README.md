# Personal portfolio

A responsive static website served by GitHub Pages from `master`. No build step, framework, or runtime dependency is required. `CNAME` retains the custom domain.

## Local preview

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765/>. The site pairs a warm, reading-focused layout with a bright palette of ocean blue, sunny yellow, and tangerine on white: self-hosted Newsreader headings and prose, a plain name heading, and rounded navigation. Pulse is featured on a solid blue panel with real App Store screens; NextMove follows as a wide card, and the remaining projects sit in a two-column grid with real images framed evenly inside matching sunny-yellow outlines. The contact band is solid blue, project-page images sit on yellow, and supporting text is at least 13px. Subtle hover motion adds personality without heavy borders or offset shadows. All styles live in one consolidated `style.css` shared by the homepage and project pages. Profile links remain inline, and the bio, project content, and earlier experience are unchanged. Original font licenses are in `assets/fonts/`.

## Checks

Node.js 20 or newer is required for development checks only:

```sh
npm ci
npx playwright install chromium
npm test
npm run format:check
```

The checks start loopback-only servers and cover responsive and landscape layouts, all eight HTML pages, the featured and two-column project layouts, a 13px minimum text size, keyboard controls, active navigation, 44px tap targets, local links/images, the supplied résumé, About/Experience content, and retired project links. They also verify the supplied Goodreads and Letterboxd links and the NextMove detail page. Automated WCAG A/AA scans, no-JavaScript fallback, and reduced motion are checked. Browser evidence is written to the ignored `test-results/` directory. Automated scans do not replace human accessibility review.

## Content

About combines a brief professional Meta summary with the owner-supplied personal bio and links to Goodreads and Letterboxd. Experience retains earlier roles in a compact layout. Professional history is grounded in the supplied résumé and verified work history; internal task/diff URLs, implementation details, and internal operational metrics are not published. The résumé PDF is unchanged from the supplied file.

The homepage lists six projects, led by Pulse and NextMove, with no category filters. Pulse uses its public App Store listing, icon, and two of its App Store screenshots. NextMove links to a local detail page explaining the owner’s daily Muse email-to-dashboard workflow. No email contents, private dashboard screenshots, or private app URL are exposed. Chatroom, calendar, and PHP file sharing are removed from homepage project navigation; old detail URLs remain available for compatibility.

The `intro-page`, `about-me`, `experience`, and `cs-projects` anchors are retained. Name, biography, and media links form one uninterrupted opening area that fills the initial viewport. A scroll cue and native proximity snap gently guide the transition into Projects without intercepting wheel or touch input. Short screens expand to fit the content; reduced-motion disables snapping. Projects follows immediately below. The About navigation link targets that complete opening, not a separate section. Navigation uses adaptive sticky-header offsets and highlights the current section; detail pages keep Projects selected and use the same four-link navigation without wrapping on small phones. All six projects remain visible without JavaScript. The NextMove card uses the sample-data screenshot, and its detail page offers a full-size image link. Previous `cs-projects/style2.css` and `style3.css` files remain available but are not loaded by refreshed pages.

## UI interactions

Project cards have explicit View project or Read paper actions and concise accessible link names. Contact and repository actions are visually distinct, with contrasting focus rings on colored panels. The sticky header gains a subtle divider after scrolling, and Pulse screenshots scale to fit small screens without horizontal clipping.

Project screenshots and the design gallery open in a native dialog with fit-to-window and original-size zoom, scrollable image panning, an original-image link, and Close/Escape/backdrop dismissal. Closing restores keyboard focus and the reader’s scroll position. Without JavaScript or dialog support, ordinary image links still work; modified clicks retain the browser’s native behavior. Image dimensions reserve layout space before lazy images load. `tests/ui-pass.cjs` covers these interactions, small-screen navigation, open-dialog accessibility, cached-image reopening, and failed image loading.

Updates to `master` publish the live site. Review the branch before merging.
