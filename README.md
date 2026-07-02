# personal-budget-manager

A simple static web app for tracking household income and expenses. Built with plain HTML/CSS + [Vue 3](https://vuejs.org/) (loaded via CDN, no build step) and [Pico.css](https://picocss.com/) for styling.

## Features

- Log dated income and expense transactions against categories
- Categories are pre-seeded from the household's existing budget (monthly income sources, annual expense budget converted to monthly)
- Monthly summary cards (income, expense, net savings vs. budget)
- Budget-vs-actual breakdown per category with progress bars
- Add/remove your own categories
- Transactions are saved directly to [`data/transactions.csv`](data/transactions.csv) in this repo — nothing leaves your machine

## Running it

It's a static site, so any static file server works:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser (don't open `index.html` directly via `file://` — the CSV file connection needs `http://` or `https://`).

### Connecting the CSV file

On first load, click **Connect CSV File** in the banner at the top and pick [`data/transactions.csv`](data/transactions.csv) from this repo. From then on, every transaction you add or delete is written straight to that file, and the app auto-reconnects to it on future visits (you may need to click **Reconnect** once per browser session — this is a browser permission requirement, not a bug). Once you're happy with what's recorded, commit `data/transactions.csv` like any other file.

This uses the File System Access API, so it only works in Chromium-based browsers (Chrome, Edge). In Safari/Firefox the app falls back to browser storage (`localStorage`) with a warning banner, and transactions won't be written to the CSV file.

Categories and budgets (not individual transactions) are still kept in the browser's `localStorage`, since they change rarely and aren't what this CSV export is for.

## Files

- `index.html` — page structure and Vue template
- `js/app.js` — app logic (state, computed totals, persistence)
- `js/seed-data.js` — default categories/budgets
- `js/csv-storage.js` — reads/writes `data/transactions.csv` via the File System Access API
- `css/styles.css` — app-specific styles
- `data/transactions.csv` — where your transactions are saved