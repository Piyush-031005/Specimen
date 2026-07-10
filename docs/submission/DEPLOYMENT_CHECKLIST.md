# DEPLOYMENT CHECKLIST

**Platform Selection:** Vercel (Recommended for Vite)

## Pre-Deployment Verification
- [x] Production build completes without errors (`npm run build`).
- [x] Bundle size is verified under 20kB gzipped.
- [x] Console is free of `console.log`, `console.error`, and debug helpers.
- [x] `package.json` contains no unused dependencies.
- [x] `index.html` has perfect metadata (Title, Description, Theme Color).

## Vercel Settings
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node Version:** Ensure 18.x or 20.x

## Post-Deployment Verification (Live URL)
- [ ] **HTTPS:** Check that the connection is secure.
- [ ] **Performance Profile:** Open Chrome DevTools (Performance Tab). Record 10 seconds of interaction. Verify the frame rate is locked at 60fps and there are no garbage collection spikes.
- [ ] **Audio Context Unlocking:** Verify that the first click/tap successfully resumes the Web Audio context on the live domain (browsers strictly block audio on live domains until user interaction).
- [ ] **Viewport Scaling:** Verify that scrolling is locked and the canvas fits perfectly on a mobile phone without clipping.

## Open Graph (Social Preview)
Before pasting the link on Twitter, LinkedIn, or the Hackathon submission portal:
- [ ] Upload the `Hero Screenshot` to the `/public` folder as `og-image.jpg`.
- [ ] Add the following line to `index.html` `<head>`:
  `<meta property="og:image" content="https://your-live-url.com/og-image.jpg">`
- [ ] Run the live URL through the [Twitter Card Validator](https://cards-dev.twitter.com/validator).
