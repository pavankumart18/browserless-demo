import puppeteer from "puppeteer-core";

const BROWSERLESS = process.env.BROWSERLESS_WS || "ws://localhost:3000/chromium";

// Test with a simpler site
const URL = "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html";

const browser = await puppeteer.connect({ browserWSEndpoint: BROWSERLESS });
const page = await browser.newPage();

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise(r => setTimeout(r, 2000));

const title = await page.title();
console.log("Title:", title);

const prices = await page.evaluate(() => {
  const all = document.body.innerText;
  const matches = [...all.matchAll(/[\$£€₹¥£]\s?[\d,]+\.?\d*/g)];
  return matches.map(m => m[0]);
});

console.log("Prices:", prices);

// Also dump raw text to see what we get
const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
console.log("\nPage text preview:\n", text);

await browser.close();