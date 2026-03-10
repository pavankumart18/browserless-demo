import puppeteer from "puppeteer-core";

const BROWSERLESS_WS = "ws://localhost:3000/chromium";

const queries = [
"best javascript frameworks",
"machine learning tutorials",
"docker container guide",
"browser automation tools",
"cloud computing platforms",
"top cybersecurity tools",
"distributed systems architecture",
"kubernetes explained",
"large language models",
"web scraping libraries",
"python automation tools",
"devops best practices",
"frontend frameworks 2025",
"backend development roadmap",
"ai tools for developers",
"open source ai projects",
"best programming languages",
"data engineering tools",
"big data platforms",
"software architecture patterns"
];

// create 100 tasks
const tasks = Array.from({ length: 100 }, (_, i) => queries[i % queries.length]);

const CONCURRENT_LIMIT = 5;

const delay = ms => new Promise(res => setTimeout(res, ms));

let dataset = [];

async function scrape(query, index) {

  let browser;

  try {

    browser = await puppeteer.connect({
      browserWSEndpoint: BROWSERLESS_WS
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    console.log(`${index + 1}. Searching → ${query}`);

    await page.goto("https://www.google.com", {
      waitUntil: "domcontentloaded"
    });

    await page.type("textarea[name='q']", query);

    await page.keyboard.press("Enter");

    await page.waitForSelector("h3");

    const firstLink = await page.evaluate(() => {

      const result = document.querySelector("a h3");

      if (!result) return null;

      return result.parentElement.href;

    });

    if (!firstLink) {

      console.log(`${index + 1}. No result for ${query}`);
      return;

    }

    await page.goto(firstLink, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    const data = await page.evaluate(() => {

      const title = document.title;

      const description =
        document.querySelector('meta[name="description"]')?.content ||
        document.querySelector('meta[property="og:description"]')?.content ||
        "";

      const text = Array.from(document.querySelectorAll("p"))
        .slice(0, 3)
        .map(p => p.innerText)
        .join(" ");

      return {
        title,
        description,
        text
      };

    });

    dataset.push({
      query,
      url: firstLink,
      ...data
    });

    console.log(`${index + 1}. Result → ${data.title}`);

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

  console.log("Running 100 Google search scraping tasks...\n");

  for (let i = 0; i < tasks.length; i += CONCURRENT_LIMIT) {

    const end = Math.min(i + CONCURRENT_LIMIT, tasks.length);

    await runBatch(i, end);

    await delay(500);

  }

  console.log("\nAll tasks completed\n");

  console.log(JSON.stringify(dataset, null, 2));

}

run();