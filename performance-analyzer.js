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

let dataset = [];

async function analyze(url, index) {

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
      url,
      title,
      loadTime
    };

    dataset.push(result);

    console.log(`${index + 1}. ${url} → ${loadTime} ms`);

  }

  catch (err) {

    console.log(`${index + 1}. Error → ${err.message}`);

  }

  finally {

    if (browser) await browser.disconnect();

  }

}

async function run() {

  console.log("Running parallel browser performance tests...\n");

  const tasks = websites.map((site, i) => analyze(site, i));

  await Promise.all(tasks);

  console.log("\nPerformance dataset:\n");

  const outputPath = "performance-analyzer-output.json";
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), "utf8");
  console.log(`Output saved to ${outputPath} (${dataset.length} items)`);
}

run();