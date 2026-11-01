# Ruchir Barhate — portfolio

Static site: `index.html`, `styles.css`, `script.js`. No build step.

## Run locally
Opening `index.html` directly works, but a local server is better (fonts and scripts behave as in production):

```
cd ruchir-portfolio
python3 -m http.server 8000
```
Then open http://localhost:8000

## External dependencies (CDN)
- Google Fonts: Big Shoulders Display, Geist, Geist Mono, Unbounded
- Lenis (smooth scroll): cdn.jsdelivr.net/npm/lenis@1.1.13

## Where things live in script.js
- Cursor + magnetic buttons, Lenis smooth scroll
- Char reveal + proximity font-weight on headings
- `TYRE_FS`: WebGL shader for the dithered tyre and the cursor grid (tuned values are constants at the top / in the background block)
- Projects: pinned horizontal scroll + dithered previews (`projects` array)
- Contact sphere, footer community graph (`net`)

## Placeholders to fill
Email, GitHub/LinkedIn/Scholar links, resume links, internship descriptions, skills tags.
The contact form has no backend (shows a note on submit).
