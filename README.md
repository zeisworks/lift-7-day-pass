# Lift STL — "7 Days Free" Landing Page

A standalone landing page for Lift STL's 7-day free trial offer, styled after the
Roman Empire Gym free-trial funnel and branded with the lift-stl.com DNA (Lift red
`#ED1C24`, Barlow Condensed / Barlow / DM Serif Display, red-pill CTA).

The offer is framed around the open **Brentwood** gym (7 years, ~550 members, 8,600 sq ft).

## Files

```
index.html            Self-contained page (inline CSS, no build step)
assets/images/        Logo, facility photos, testimonial photos
assets/videos/        Hero background video + poster
```

## Preview locally

Open `index.html` in any browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/
```

## Hosting on Wix

- **Option A (fastest):** Paste `index.html` into a Wix *Embed → Custom HTML (iframe)*
  element. Upload the files in `assets/` to Wix Media, then swap each `./assets/...`
  `src` for its Wix Media URL.
- **Option B (reference build):** Use the page as a pixel/copy reference and rebuild
  the sections natively in the Wix editor.

## Before going live — fill in the placeholders

Search `index.html` for `EDIT:` (12 spots) and replace with real data:

- Google review count (hero badge, header, stats strip)
- Testimonial names, quotes, and tenure
- FAQ answers (what's included, card/ID policy, eligibility, address & hours, after-trial options)
- Footer links (site + Instagram) and address/hours

## The "7-Days Free" CTA

CTA buttons are styled anchors (`href="#"`). Wire them up in Wix to your booking
form / lead capture once the page is in the editor.
