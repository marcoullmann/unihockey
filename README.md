# Unihockey

A free, one-page website that displays data from a **public Google Sheet** — no backend,
no API key, no build step. Pure static HTML/CSS/JS, hosted on Vercel.

## How it works

The page reads your sheet through Google's public `gviz` JSON endpoint. As long as the
sheet is shared as *"Anyone with the link → Viewer"*, the browser can fetch it directly.
Features: live filter, click-to-sort columns, refresh button, responsive layout.

## Point it at your sheet

1. Open your Google Sheet → **Share** → **General access: Anyone with the link → Viewer**.
2. Copy the id from the URL:
   `https://docs.google.com/spreadsheets/d/`**`<SHEET_ID>`**`/edit#gid=0`
3. Edit [`config.js`](./config.js):
   ```js
   window.APP_CONFIG = {
     SHEET_ID: "your-sheet-id-here",
     SHEET_NAME: "",          // tab name, or "" for the first tab
     TITLE: "Unihockey",
     SUBTITLE: "Live data from Google Sheets",
   };
   ```
4. Commit & push — Vercel redeploys automatically.

## Run locally

It's static, so any static server works:

```bash
npx serve .
# then open the printed http://localhost:... URL
```

## Deploy

Connected to Vercel — every push to `main` triggers a production deploy.
