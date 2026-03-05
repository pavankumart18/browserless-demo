# Browserless Demo

Node.js scripts that use **Browserless** (remote Chromium) with **Puppeteer** for browser automation, screenshots, PDF generation, and simple research/scraping agents.

**Prerequisites:** Docker (for Browserless) and Node.js.

---

## Quick Start

1. **Start Browserless** (in one terminal):

   ```bash
   docker run -p 3000:3000 ghcr.io/browserless/chromium
   ```

   The WebSocket endpoint is `ws://localhost:3000`.

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run any script** (see file descriptions and commands below).

---

## Project Files Explained

### Scripts (run with `node <file>`)

| File | Purpose | Output / Behavior |
|------|---------|-------------------|
| `demo.js` | Basic automation: open Hacker News, scrape top 5 headline titles, print to console. | Console only |
| `screenshot.js` | Opens openai.com and saves a full-page screenshot. | `openai.png` |
| `github-screenshot.js` | Opens a single GitHub profile (pavankumart18), sets viewport, saves full-page screenshot. | `pavan-github.png` |
| `multi-github-screenshot.js` | Opens multiple GitHub profile URLs in sequence and saves a screenshot per profile. | `pavankumart18.png`, `torvalds.png`, `openai.png` |
| `github-pdf.js` | Opens a GitHub profile and generates an A4 PDF of the page. | `github-profile.pdf` |
| `research-agent.js` | Asks for a research topic, searches DuckDuckGo, extracts top 5 result titles, builds an HTML report and saves as PDF. | `research-report.pdf` |
| `chatgpt-agent.js` | **Experimental.** Opens ChatGPT, types a question, waits for response, extracts answer and saves to PDF. Unreliable due to React/streaming/WebSocket (see [EXPERIMENTS.md](./EXPERIMENTS.md)). | `chatgpt-response.pdf` |
| `autonomous-research-agent.js` | Asks for a topic → searches DuckDuckGo → collects top 3 result links → opens each URL → scrapes first 5 `<p>` per page → builds a combined HTML report and saves as PDF. | `research-report.pdf` |
| `full-page-scraper.js` | Asks for a URL → loads page → extracts title, up to 10 headings, 10 paragraphs, 10 links → prints to console and generates a PDF report. | `scraped-page-report.pdf` |

### Config & Docs

| File | Purpose |
|------|--------|
| `package.json` | Project metadata and dependencies: `puppeteer-core`, `readline-sync`. Defines `main` as `index.js` and a placeholder `test` script. |
| `package-lock.json` | Lockfile for reproducible `npm install`. |
| `EXPERIMENTS.md` | Full write-up of all Browserless experiments: setup, what worked, what failed (e.g. ChatGPT, Google), bottlenecks, when to use Browserless, and future ideas. |

---

## How to Run Each Script

Ensure Browserless is running on port 3000, then:

```bash
# Basic demo (Hacker News headlines)
node demo.js

# Single site screenshot
node screenshot.js

# One GitHub profile screenshot
node github-screenshot.js

# Multiple GitHub profile screenshots
node multi-github-screenshot.js

# GitHub profile as PDF
node github-pdf.js

# Research: topic → DuckDuckGo → PDF of result titles
node research-agent.js

# (Unreliable) ChatGPT question → PDF
node chatgpt-agent.js

# Research: topic → DuckDuckGo → visit top 3 links → scrape paragraphs → PDF
node autonomous-research-agent.js

# Full-page scrape: URL → title/headings/paragraphs/links → console + PDF
node full-page-scraper.js
```

Scripts that use `readline-sync` will prompt in the terminal (e.g. research topic or URL).

---

## Architecture (high level)

```
Your script (Node)
    → Puppeteer (puppeteer-core)
        → connect to ws://localhost:3000
            → Browserless (Chromium)
                → Target website
```

All scripts use `puppeteer.connect({ browserWSEndpoint: "ws://localhost:3000" })` instead of `puppeteer.launch()`.

---

## More Detail

For full context—what was tried, what failed, and recommendations—see **[EXPERIMENTS.md](./EXPERIMENTS.md)**.
