import puppeteer from "puppeteer-core";
import fs from "fs";

const BROWSERLESS_WS = "ws://localhost:3000/chromium";

const TOTAL_BROWSERS = 50;
const CONCURRENT_LIMIT = 10;

const delay = ms => new Promise(r => setTimeout(r, ms));

let dataset = [];

async function crawl(index) {

  let browser;

  try {

    browser = await puppeteer.connect({
      browserWSEndpoint: BROWSERLESS_WS
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    let source = "";
    let link = null;

    // ---------- HackerNews ----------
    if (index < 10) {

      source = "HackerNews";

      await page.goto("https://news.ycombinator.com", {
        waitUntil: "domcontentloaded"
      });

      link = await page.evaluate((i) => {

        const items = document.querySelectorAll(".titleline a");
        const item = items[i % items.length];

        return item ? item.href : null;

      }, index);

    }

    // ---------- GitHub Trending ----------
    else if (index < 20) {

      source = "GitHub Trending";

      await page.goto("https://github.com/trending", {
        waitUntil: "domcontentloaded"
      });

      link = await page.evaluate((i) => {

        const repos = document.querySelectorAll("article h2 a");
        const repo = repos[i % repos.length];

        if (!repo) return null;

        return "https://github.com" + repo.getAttribute("href");

      }, index);

    }

    // ---------- ArXiv ----------
    else if (index < 30) {

      source = "ArXiv AI";

      await page.goto("https://arxiv.org/list/cs.AI/recent", {
        waitUntil: "domcontentloaded"
      });

      link = await page.evaluate((i) => {

        const papers = document.querySelectorAll("dt a[href*='/abs/']");
        const paper = papers[i % papers.length];

        return paper ? "https://arxiv.org" + paper.getAttribute("href") : null;

      }, index);

    }

    // ---------- Reuters ----------
    else if (index < 40) {

    source = "Reuters";

    await page.goto("https://www.reuters.com/world/", {
        waitUntil: "domcontentloaded"
    });

    await delay(2000);

    link = await page.evaluate((i) => {

        const articles = document.querySelectorAll("a[data-testid='Heading']");

        const article = articles[i % articles.length];

        return article ? article.href : null;

    }, index);

    }

    // ---------- Wikipedia ----------
    else {

      source = "Wikipedia";

      await page.goto("https://en.wikipedia.org/wiki/Main_Page", {
        waitUntil: "domcontentloaded"
      });

      link = await page.evaluate((i) => {

        const items = document.querySelectorAll("#mp-itn b a");

        const item = items[i % items.length];

        return item
          ? "https://en.wikipedia.org" + item.getAttribute("href")
          : null;

      }, index);

    }

    if (!link) {

      console.log(`${index + 1}. [${source}] → No link`);
      return;

    }

    await page.goto(link, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await delay(1000);

    const article = await page.evaluate(() => {

      const title = document.title;

      const description =
        document.querySelector('meta[name="description"]')?.content ||
        document.querySelector('meta[property="og:description"]')?.content ||
        "";

      const paragraphs = Array.from(document.querySelectorAll("p"))
        .slice(0, 5)
        .map(p => p.innerText)
        .join(" ");

      return {
        title,
        description,
        content: paragraphs
      };

    });

    const data = {
      source,
      url: link,
      ...article
    };

    dataset.push(data);

    console.log(`${index + 1}. [${source}] → ${article.title}`);

  }

  catch (err) {

    console.log(`${index + 1}. Error → ${err.message}`);

  }

  finally {

    if (browser) await browser.disconnect();

  }

}

async function runBatch(start, end) {

  const tasks = [];

  for (let i = start; i < end; i++) {
    tasks.push(crawl(i));
  }

  await Promise.all(tasks);

}

async function run() {

  console.log(`Launching ${TOTAL_BROWSERS} distributed crawler browsers...\n`);

  for (let i = 0; i < TOTAL_BROWSERS; i += CONCURRENT_LIMIT) {

    const end = Math.min(i + CONCURRENT_LIMIT, TOTAL_BROWSERS);

    await runBatch(i, end);

  }

  console.log("\nAll tasks completed\n");

  const outputPath = "parallel-browsers-output.json";
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), "utf8");
  console.log(`Output saved to ${outputPath} (${dataset.length} items)`);
}

run();