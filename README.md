# Browserless Demo

Node.js scripts that use **Browserless** (remote Chromium) with **Puppeteer** for parallel crawling, performance analysis, and scraping.

**Prerequisites:** Docker (for Browserless) and Node.js.

---

## Quick Start

1. **Start Browserless** (in one terminal):

   ```bash
   docker run -p 3000:3000 ghcr.io/browserless/chromium
   ```

   The WebSocket endpoint is `ws://localhost:3000` (scripts use `ws://localhost:3000/chromium`).

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run any script** (see below).

---

## Project Files

### Scripts

| File | Purpose | Output |
|------|---------|--------|
| `parallel-browsers.js` | Parallel crawler: 50 tasks across Hacker News, GitHub Trending, ArXiv, Reuters, Wikipedia; extracts title, description, content from each linked page. | `parallel-browsers-output.json` |
| `performance-analyzer.js` | Measures load time (domcontentloaded) for 10 websites in parallel. | `performance-analyzer-output.json` |
| `scrape-100-sites.js` | 100 tasks (10 sites repeated): visits each URL, records title and load time. Batched with concurrency limit 5. | `scrape-100-sites-output.json` |
| `scrape-2.js` | 100 search-query tasks: runs queries (e.g. DuckDuckGo), collects results into a dataset. Batched with concurrency limit 5. | Console (JSON) |

### Other

| File | Purpose |
|------|--------|
| `package.json` | Dependencies: `puppeteer-core`, `readline-sync` (if needed). |
| `EXPERIMENTS.md` | Write-up of Browserless experiments and recommendations. |

---

## How to Run

```bash
# Parallel multi-source crawler → JSON
node parallel-browsers.js

# Performance (load times) for 10 sites → JSON
node performance-analyzer.js

# 100 site visits (title + load time) → JSON
node scrape-100-sites.js

# 100 search-query scrape tasks
node scrape-2.js
```

---

## Architecture

```
Node script → Puppeteer (connect) → Browserless (ws://localhost:3000/chromium) → Chromium → Website
```
