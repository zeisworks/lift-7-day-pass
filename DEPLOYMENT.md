# Lift STL — "7 Days Free" Landing Page · Deployment Guide

This guide covers every way to put this page live, plus the one thing you must
wire up regardless of host: **the lead form**.

---

## 0. What you have

```
index.html              Self-contained landing page (inline CSS + JS, no build step)
assets/images/          Logo, facility photos, sauna, testimonial photos
assets/videos/          Hero background video + poster
wix/lift-pass.js        The whole page packaged as a Wix Custom Element (web component)
```

The page is currently live on GitHub Pages:
**https://zeisworks.github.io/lift-7-day-pass/**

---

## 1. Pick a hosting path

| Path | Effort | Best when | Lead capture |
|------|--------|-----------|--------------|
| **A. Standalone static site** | Lowest | You just want the funnel live on its own URL | Form service or your CRM |
| **B. Embed in Wix (iframe)** | Low | You want it *inside* a Wix page, quick & dirty | Form service (not Wix-native) |
| **C. Wix Custom Element (Velo)** | Medium | You want it on Wix, rendered natively | Wix CRM via Velo, or form service |
| **D. Wix Headless** | High | You want full control + Wix as backend | Wix APIs |

**Recommendation:** If you don't specifically need it living on Wix, use **Path A** —
it's already built, fast, and responsive. If it must be on Wix, use **Path C**.

---

## Path A — Standalone static site (recommended)

The page is plain HTML/CSS/JS, so any static host works.

### A1. Keep it on GitHub Pages (already set up)
Pushing to the `main` branch auto-deploys via `.github/workflows/deploy.yml`.
Nothing else to do — it's live at the URL above.

### A2. Put it on a custom domain
1. In the repo: **Settings → Pages → Custom domain**, enter e.g. `join.lift-stl.com`.
2. At your DNS provider, add a **CNAME** record:
   `join` → `zeisworks.github.io`
3. Wait for DNS + tick **Enforce HTTPS**.
   Docs: https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site

### A3. (Alternative hosts)
Drag-and-drop the folder to **Netlify**, **Cloudflare Pages**, or **Vercel** — all
free for static sites and give you a domain + HTTPS automatically.

➡ Then do **Section 2 (wire the form)**.

---

## Path B — Embed inside a Wix page (iframe)

1. Wix Editor → **Add → Embed Code → Embed HTML**.
2. Choose **"Website address"** and enter the live URL
   (`https://zeisworks.github.io/lift-7-day-pass/`).
3. Stretch the element to full width and set a tall height.

**Limitations (read these):**
- It renders in a **fixed-height iframe** — it won't auto-grow; the sticky bar and
  popup feel boxed in.
- The form **cannot talk to Wix** from inside an iframe — use a form service
  (Section 2, Option 1).

For a better Wix result, use Path C instead.

---

## Path C — Wix Custom Element via Velo (native, no iframe)

This renders the page as a real web component **inline** on a Wix page, with its
styles isolated (Shadow DOM) so Wix's theme can't interfere.

### Prerequisites
- A Wix Premium site (custom code requires a paid plan).
- The file **`wix/lift-pass.js`** from this repo.

### Steps
1. **Enable Dev Mode (Velo):** Editor top bar → toggle **Dev Mode** on. The
   **Public / Backend** file tree appears.
2. **Add the file:** In the Velo sidebar under **Public**, create
   `lift-pass.js` and paste the contents of `wix/lift-pass.js` (or upload it).
3. **Place the element:** **Add → Embed Code → Custom Element.** In its settings:
   - **Tag name:** `lift-pass`
   - **Source / Server URL:** select the `lift-pass.js` file in **Public**
4. **Size it:** drop it into a **full-width section**, set the element to full
   width. The component renders its own layout and height.
5. **Preview on the published site.** Custom elements run in **Preview/Published**,
   not on the editor canvas.

Docs:
- Custom Element: https://dev.wix.com/docs/velo (search "Custom Element")
- `$w` Custom Element API: https://dev.wix.com/docs/velo/api-reference/$w/custom-element/introduction

### Notes
- **Assets** are baked into `lift-pass.js` as absolute URLs pointing at GitHub
  Pages — they load as-is. To move them into Wix, see **Section 3**.
- **Fonts** load at the document level automatically (the component injects the
  Google Fonts link).
- **Shadow DOM** keeps Wix styles out — no class collisions.

➡ Then do **Section 2 (wire the form)**.

---

## Path D — Wix Headless (advanced)

Host your own frontend (this HTML, or a React/Next rebuild) and use Wix purely as a
backend (Bookings, CRM, Stores) via the Wix SDK/APIs. Only worth it if you're
building a larger app around Wix data. Docs: https://dev.wix.com/docs (Headless).

---

## 2. Wire up the lead form (required on every path)

Right now the popup form just shows a confirmation — **it does not send the data
anywhere yet**. Pick one:

### Option 1 — A form service (fastest, works everywhere)
Use **Formspree** (or Basin, Getform, etc.).
1. Create a form at https://formspree.io and copy your endpoint
   (e.g. `https://formspree.io/f/abcwxyz`).
2. Find the claim-form submit handler:
   - **Standalone (`index.html`):** in the `<script>` near the bottom, the
     `claimForm.addEventListener('submit', …)` block.
   - **Wix Custom Element (`wix/lift-pass.js`):** the same `claimForm` block (look
     for `// TODO: send lead data…`).
3. Replace the handler body with:

```js
claimForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var data = Object.fromEntries(new FormData(claimForm).entries());
  fetch('https://formspree.io/f/abcwxyz', {        // <-- your endpoint
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  showStep(1); // show the confirmation + journey questions
});
```

Leads arrive in your Formspree inbox / forward to email.

### Option 2 — Wix CRM via Velo (native, Path C only)
Save leads straight into Wix Contacts.

1. In the Velo **Backend** folder, create **`http-functions.js`**:

```js
import { ok, badRequest } from 'wix-http-functions';
import { contacts } from 'wix-crm-backend';

// Exposed at: https://YOUR-SITE/_functions/lead
export async function post_lead(request) {
  try {
    const b = await request.body.json();
    await contacts.appendOrCreateContact({
      name:   { first: b.first_name, last: b.last_name },
      emails: [{ email: b.email }],
      phones: b.phone ? [{ phone: b.phone }] : []
    });
    return ok({ headers: { 'Content-Type': 'application/json' }, body: { ok: true } });
  } catch (err) {
    return badRequest({ body: { error: String(err) } });
  }
}
```
   (Confirm the current `contacts` signature here:
   https://dev.wix.com/docs/velo/api-reference/wix-crm-backend/contacts/introduction
   and http-functions here:
   https://dev.wix.com/docs/velo/api-reference/wix-http-functions/introduction)

2. In `lift-pass.js`, point the form at it (same origin, so a relative path works):

```js
claimForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var data = Object.fromEntries(new FormData(claimForm).entries());
  fetch('/_functions/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  showStep(1);
});
```

3. (Optional) Also collect the journey answers — repeat the same `fetch` inside the
   `journeyForm` submit handler.

---

## 3. Move assets into Wix Media (optional, Path C)

If you'd rather not depend on GitHub Pages for images/video:
1. Upload everything in `assets/` to **Wix Media** and copy each file's URL.
2. In `lift-pass.js`, replace the
   `https://zeisworks.github.io/lift-7-day-pass/assets/...` URLs with the Wix Media
   URLs.

---

## 4. Updating content & cache-busting

- **Edit copy/photos:** change `index.html` (and re-generate `wix/lift-pass.js` if
  you use Path C) and push to `main`.
- **Swapping an image with the same filename:** browsers cache images hard. Bump the
  version query in the `src`, e.g. `infrared-sauna.webp?v=2` → `?v=3`. (That's why the
  sauna image already has `?v=2`.)
- **Page not updating after deploy:** it's almost always browser cache. Hard-refresh
  (`Cmd/Ctrl+Shift+R`) or load `…/lift-7-day-pass/?v=N` with a new number.

---

## 5. Pre-launch checklist

- [ ] **Form wired up** (Section 2) and tested with a real submission.
- [ ] Search `index.html` for **`EDIT:`** and fill remaining placeholders
      (staffed hours, FAQ specifics, etc.).
- [ ] Confirm the **address** is correct (8356 Musick Memorial Dr, Brentwood, MO 63144).
- [ ] Confirm the **offer terms** in the popup (first-time guest, 18+, within 20 mi,
      photo ID + card on file).
- [ ] Footer links point to the right places (lift-stl.com, Instagram).
- [ ] Test on **mobile** (hero, popup, sticky CTA after scroll, video autoplay).
- [ ] Map section shows the correct location (Path A/embedded live URL).
- [ ] If running paid ads: make sure the ad's promise matches the hero ("Free
      7-Day Pass · Brentwood").

---

## 6. Quick troubleshooting

| Symptom | Fix |
|--------|-----|
| Changes not showing | Browser/CDN cache — hard refresh or `?v=N` |
| New image not showing | Bump the `?v=` on that image's `src` |
| Custom element blank in Wix editor | Custom elements only run in **Preview/Published** |
| Form does nothing | You haven't completed Section 2 |
| Map is blank | The embed needs network; check the live site, not a sandbox |
| Video not autoplaying | Must be `muted` (it is); some browsers block until interaction |

---

*Questions or changes? The source of truth is `index.html`; the Wix component is
generated from it as `wix/lift-pass.js`.*
