const puppeteer = require("puppeteer-core");
const fs = require("fs");

const BROWSERLESS_WS = "ws://localhost:3000/chromium";

const websites = [
"https://google.com",
"https://github.com",
"https://wikipedia.org",
"https://news.ycombinator.com",
"https://npmjs.com",
"https://stackoverflow.com",
"https://mozilla.org",
"https://python.org",
"https://nodejs.org",
"https://docker.com"
];

// repeat websites to make 100 tasks
const tasks = Array.from({ length: 100 }, (_, i) => websites[i % websites.length]);

const CONCURRENT_LIMIT = 5;

const delay = ms => new Promise(res => setTimeout(res, ms));

let results = [];

async function scrape(url, index) {

  let browser;

  try {

    browser = await puppeteer.connect({
      browserWSEndpoint: BROWSERLESS_WS
    });

    const page = await browser.newPage();

    const start = Date.now();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    const loadTime = Date.now() - start;

    const title = await page.title();

    const result = {
      index,
      url,
      title,
      loadTime
    };

    results.push(result);

    console.log(`${index + 1}. ${url} → ${loadTime} ms`);

  }

  catch (err) {

    console.log(`${index + 1}. Error → ${err.message}`);

  }

  finally {

    if (browser) await browser.disconnect();

  }

}

async function runBatch(start, end) {

  const jobs = [];

  for (let i = start; i < end; i++) {
    jobs.push(scrape(tasks[i], i));
  }

  await Promise.all(jobs);

}

async function run() {

  console.log("Scraping 100 websites with Browserless...\n");

  for (let i = 0; i < tasks.length; i += CONCURRENT_LIMIT) {

    const end = Math.min(i + CONCURRENT_LIMIT, tasks.length);

    await runBatch(i, end);

    await delay(500);

  }

  console.log("\nAll scraping completed!\n");

  const outputPath = "scrape-100-sites-output.json";
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`Output saved to ${outputPath} (${results.length} items)`);
}

run();