# FreedomFest Website 🎪

A neon, party-vibed single-page site for FreedomFest — the bi-annual friends-only
festival at The Firs, Wendling, Norfolk.

## What's here

```
index.html            The whole site (hero, about, gallery, stay & prices, sign-up, directions)
css/style.css         Neon party theme
js/main.js            Nav, gallery lightbox, sign-up form submission
apps-script/Code.gs   Google Apps Script that writes sign-ups into your Google Sheet
img/                  Festival photos used in the gallery
```

No build step — just open `index.html` in a browser, or host the folder on any
static host (Netlify, GitHub Pages, Cloudflare Pages…).

## Wiring the sign-up form to your Google Sheet (~5 mins)

The form posts to a Google Apps Script "web app" attached to your spreadsheet.
Submissions land in a new tab called **Website Sign-Ups** (created automatically) —
your existing tabs are untouched, and no bank details are involved anywhere.

1. Open the FreedomFest Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Delete any placeholder code and paste in the contents of `apps-script/Code.gs`. Save.
4. Click **Deploy → New deployment**.
   - Click the gear next to "Select type" and choose **Web app**.
   - Description: anything, e.g. "FF sign-up form".
   - **Execute as: Me**
   - **Who has access: Anyone** (required so the website can post to it — the URL is
     unguessable and the script can only *append rows*, it can't read anything out).
5. Click **Deploy**, authorise when prompted, and copy the **Web app URL**
   (it looks like `https://script.google.com/macros/s/AKfycb.../exec`).
6. Open `js/main.js` and paste that URL into the first line:
   ```js
   const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
7. Done! Test the form — a row should appear in the **Website Sign-Ups** tab.

> If you later edit `Code.gs`, you must **Deploy → Manage deployments → Edit →
> New version** for changes to take effect (saving alone isn't enough).

Until the URL is set, the form shows a friendly "not wired up yet" message
rather than silently failing.

## Notes

- **Prices** on the site are labelled as a guide, since final pricing depends on
  sign-up numbers each year. Update them in the "Stay & Prices" section of
  `index.html` whenever they change.
- **Photos**: drop new images into `img/` and add a `<figure class="g-item">` block
  in the gallery section. `g-wide` / `g-tall` classes make a photo span 2 columns/rows.
- **No bank details** appear anywhere on the site, by design. Payment info is shared
  privately with confirmed attendees.
