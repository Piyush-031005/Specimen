# FINAL SUBMISSION CHECKLIST

This is the ultimate QA and deployment checklist. Do not submit the project to any awards platform until every single box is checked.

## 1. The Deployment Audit
- [ ] **Platform:** Ensure the project is deployed to a high-performance CDN (Vercel, Netlify, or Cloudflare Pages).
- [ ] **Build Command:** Verified that the deployment platform is using `npm run build`.
- [ ] **Output Directory:** Verified that the deployment platform is serving the `dist` directory.
- [ ] **HTTPS:** Verified that the live URL enforces HTTPS. (Crucial for `performance.now()` precision and Web Audio APIs in some browsers).
- [ ] **Live Test:** Opened the live production URL and verified that the frame rate holds at 60fps.

## 2. The Final Repository Audit
*The code is final. This is the metadata check.*
- [x] **README.md:** Rewritten to be emotional and mysterious, framing the project for judges.
- [x] **package.json:** Clean. Unused dependencies removed.
- [x] **index.html (Accessibility):** Canvas has `aria-label` and `role="img"`.
- [x] **index.html (Favicon):** Inline SVG data URI added to prevent 404 console errors.
- [x] **index.html (SEO/Metadata):** Title and Description meta tags are set.
- [x] **Bundle Size:** Verified production JS is under 20kB gzipped (Currently 16.09kB).
- [ ] **OG Image:** (Optional but highly recommended) Add an Open Graph `<meta property="og:image" content="https://your-url.com/og-image.jpg">` pointing to the Hero Screenshot.

## 3. The Cross-Browser QA
*You must physically open the live URL in these browsers:*
- [ ] **Chrome (Desktop):** Verify 60FPS. Verify Web Audio synthesis.
- [ ] **Safari (Mac):** Verify 60FPS. Verify that the canvas resizes correctly (Safari sometimes handles `100vh` differently).
- [ ] **Firefox (Desktop):** Verify particle additive blending (`lighter` composite operation).
- [ ] **Edge (Windows):** Verify cursor hiding logic.
- [ ] **Mobile (iOS Safari / Android Chrome):** Verify touch events register correctly as `USER_INPUT`.

## 4. The Human QA (The "Blind" Test)
- [ ] Friend 1 tested. First sentence recorded: ________________________
- [ ] Friend 2 tested. First sentence recorded: ________________________
- [ ] Friend 3 tested. First sentence recorded: ________________________
- [ ] Friend 4 tested. First sentence recorded: ________________________
- [ ] Friend 5 tested. First sentence recorded: ________________________
*Rule: Only fix issues if 3 out of 5 people experience the exact same severe friction point.*

## 5. The Media Package
- [ ] **Trailer:** 45-second 60FPS `.mp4` recorded via OBS. Storyboard followed perfectly. No desktop UI visible.
- [ ] **Hero Screenshot:** High-contrast `.png` extracted.
- [ ] **Close-up Screenshot:** High-contrast `.png` extracted.
- [ ] **Wide Screenshot:** High-contrast `.png` extracted.
- [ ] **Signature Moment Screenshot:** High-contrast `.png` extracted.

## 6. The Freeze
- [ ] No more code changes.
- [ ] No more "invisible optimizations."
- [ ] The repository is frozen.
- [ ] Submit to Awwwards / FWA / CSSDA.
