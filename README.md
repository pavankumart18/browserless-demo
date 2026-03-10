# Browserless Demo (Automation, BQL, Evidence Capture)

This repo is a collection of **Browserless + Puppeteer** experiments:

- **Local Browserless (Docker)** via WebSocket (`ws://localhost:3000/chromium`)
- **BrowserQL (BQL)** + **Stealth / Proxy Geo** on Browserless Cloud
- **“Evidence capture”** style audits (screenshots + HTML + JSON report bundles)
- **A small web app** (Express) that streams results while probing regional pricing

---

## Setup

### Local Browserless (recommended for most scripts here)

```bash
docker run -p 3000:3000 ghcr.io/browserless/chromium
npm install
```

Most local scripts connect to `ws://localhost:3000/chromium` (override with `BROWSERLESS_WS` if you need auth/stealth flags).

### Browserless Cloud scripts (require a real token)

Some scripts call `https://production-sfo.browserless.io/...` and require `BROWSERLESS_TOKEN` in your environment.

---

## What we tried (and what the outputs are)

### 1) Parallel crawling / throughput tests (local WebSocket)

- `parallel-browsers.js`
  - **What it does**: Launches 50 crawler tasks (concurrency 10) across Hacker News, GitHub Trending, ArXiv, Reuters, Wikipedia. For each chosen link it extracts `{title, description, content}`.
  - **Output**: `parallel-browsers-output.json`

- `performance-analyzer.js`
  - **What it does**: Measures `domcontentloaded` load time for 10 popular sites in parallel.
  - **Output**: `performance-analyzer-output.json`

- `scrape-100-sites.js`
  - **What it does**: Runs 100 visit tasks (10 sites repeated) with concurrency limit 5 and records `{index, url, title, loadTime}`.
  - **Output**: `scrape-100-sites-output.json`

- `scrape-2.js`
  - **What it does**: Runs 100 Google search tasks (queries repeated) and attempts to open the first result to extract `{title, description, text}`.
  - **Output**: prints JSON to console (no file currently)
  - **Observed limitation**: Google often blocks/changes UI; results can be flaky.

- `shared-session-demo.js`
  - **What it does**: Demonstrates a “shared session” flow: capture cookies after manual login (Hacker News login page), then open many pages with the same cookies.
  - **Output**: console logs (no files)

### 2) Dark pattern detector + evidence bundle (local WebSocket)

- `dark_pattern.js`
  - **What it does**: Visits a target URL (default `https://www.booking.com`), injects a DOM audit to detect common dark patterns (cookie banner asymmetry, fake urgency timers, scarcity pressure phrases, pre-checked add-ons, hidden opt-outs, confirm-shaming, etc.) and logs common tracker requests.
  - **Outputs (written to a timestamped folder)**:
    - `evidence_<domain>_<timestamp>/screenshot.png`
    - `evidence_<domain>_<timestamp>/page.html`
    - `evidence_<domain>_<timestamp>/report.json`
    - `evidence_<domain>_<timestamp>/summary.txt`

- `evidence_booking.com_2026-03-10T06-11-15/` (example output already in this repo)
  - `summary.txt`: human-readable audit summary
  - `report.json`: structured findings + tracker list
  - `page.html`: captured rendered HTML
  - `screenshot.png`: full-page screenshot of what the crawler saw

### 3) Steam regional price detector (local Express app + Browserless)

- `server.js` + `index.html`
  - **What it does**: A small web UI that takes a Steam App URL/ID and probes multiple regions (US/IN/TR/AR) by setting Steam cookies + `cc=` country param. Streams progress to the browser using **Server-Sent Events (SSE)** and returns:
    - extracted regional prices
    - simple USD-equivalent conversion
    - per-region load time
    - screenshots (base64) for quick visual verification
  - **How to run**:

    ```bash
    node server.js
    # then open http://localhost:4000
    ```

### 4) “Debug/spot-check” scraping

- `debug_price.js`
  - **What it does**: Quick smoke test against `books.toscrape.com` to verify extraction of price-like strings from page text.
  - **Output**: console logs

### 5) Browserless Cloud: BrowserQL (BQL), solve/verify, and geo proxy

- `geo.js`
  - **What it does**: Runs a BrowserQL mutation against a Booking.com search results page using **residential proxy** and `proxyCountry` for `us`, `gb`, `in`. Captures HTML + a screenshot and does a quick regex price extraction.
  - **Outputs**: `geo_us.png`, `geo_gb.png`, `geo_in.png` (written locally)

- `liveurl.js`
  - **What it does**: Local “live debugging” helper: connects to local Browserless and prints a Chrome DevTools Inspector URL for the current page target so you can watch/interact with the remote page.
  - **Output**: console logs (DevTools URL)

- `solve.js`
  - **What it does**: BrowserQL demo: Google reCAPTCHA demo page (`/recaptcha/api2/demo`) + `solve`.
  - **Outputs**: `before.png`, `after.png`

- `solve2.js`
  - **What it does**: BrowserQL stealth demo: hCaptcha demo + `solve(type: hcaptcha)`.
  - **Outputs**: `before.png`, `after.png` (overwrites if you run after `solve.js`)

- `solve3.js`
  - **What it does**: BrowserQL stealth demo: Cloudflare challenge site (`nowsecure.nl`) + `verify(type: cloudflare)`.
  - **Outputs**: `before.png`, `after.png` (overwrites if you run after `solve.js`/`solve2.js`)

- `function.js`
  - **What it does**: Calls Browserless Cloud `/function` endpoint with a small Puppeteer “serverless function” that extracts page stats (title, H1, meta description, link/image counts, word count).
  - **Output**: console logs (raw response + parsed JSON)

### 6) Notes / report

- `browserless.md`
  - **What it is**: A long-form “deep research” style report on Browserless capabilities (REST endpoints, BQL, `/function`, unblock/stealth, LiveURL, evidence capture patterns, etc.).

---

## How to run (quick commands)

```bash
# Local WebSocket scripts
node parallel-browsers.js
node performance-analyzer.js
node scrape-100-sites.js
node scrape-2.js
node shared-session-demo.js
node dark_pattern.js
node debug_price.js

# Local web app
node server.js

# Browserless Cloud scripts (need BROWSERLESS_TOKEN)
BROWSERLESS_TOKEN=... node geo.js
BROWSERLESS_TOKEN=... node solve.js
BROWSERLESS_TOKEN=... node solve2.js
BROWSERLESS_TOKEN=... node solve3.js
BROWSERLESS_TOKEN=... node function.js
```

---

## Repo file inventory (everything in this repo)

### Code

- `parallel-browsers.js` — parallel crawler → `parallel-browsers-output.json`
- `performance-analyzer.js` — load-time benchmark → `performance-analyzer-output.json`
- `scrape-100-sites.js` — 100 visit tasks → `scrape-100-sites-output.json`
- `scrape-2.js` — Google search scraping (flaky) → console JSON
- `shared-session-demo.js` — cookie/session reuse demo → console logs
- `dark_pattern.js` — dark pattern + tracker audit → `evidence_*` folder bundle
- `server.js` — Steam regional price detector API + SSE
- `index.html` — Steam regional price detector UI (served by `server.js`)
- `debug_price.js` — quick extraction smoke test → console logs
- `geo.js` — BQL + residential proxy geo capture → `geo_*.png`
- `liveurl.js` — prints a DevTools Inspector URL for a live session
- `solve.js` / `solve2.js` / `solve3.js` — BQL solve/verify demos → `before.png`, `after.png`
- `function.js` — Browserless Cloud `/function` example → console logs

### Docs

- `README.md` — this file
- `browserless.md` — deep research report / idea map

### Outputs / artifacts checked into the repo

- `parallel-browsers-output.json`
- `performance-analyzer-output.json`
- `scrape-100-sites-output.json`
- `parallel-research-output.json` (older run artifact; not produced by a currently-listed script)
- `evidence_booking.com_2026-03-10T06-11-15/` (example evidence bundle)
- `geo_us.png`, `geo_gb.png`, `geo_in.png`
- `before.png`, `after.png`
- `result.png` (misc output image)

### Project config

- `package.json`, `package-lock.json`
- `.gitignore` (ignores `node_modules/`)
