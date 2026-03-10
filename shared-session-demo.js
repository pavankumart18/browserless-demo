import puppeteer from "puppeteer-core";

const BROWSERLESS_WS = "ws://localhost:3000/chromium";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let savedCookies = null;

async function login() {

  const browser = await puppeteer.connect({
    browserWSEndpoint: BROWSERLESS_WS
  });

  const page = await browser.newPage();

  console.log("Opening login page...");

  await page.goto("https://news.ycombinator.com/login");

  console.log("Please login manually in the browser...");

  await delay(20000);

  savedCookies = await page.cookies();

  console.log("Session cookies captured.");

  await browser.disconnect();
}

async function openWithSession(index) {

  const browser = await puppeteer.connect({
    browserWSEndpoint: BROWSERLESS_WS
  });

  const page = await browser.newPage();

  await page.setCookie(...savedCookies);

  await page.goto("https://news.ycombinator.com");

  const title = await page.title();

  console.log(`${index} → ${title}`);

  await browser.disconnect();
}

async function run() {

  await login();

  console.log("\nLaunching 50 browsers using same session...\n");

  const tasks = [];

  for (let i = 1; i <= 50; i++) {
    tasks.push(openWithSession(i));
  }

  await Promise.all(tasks);

  console.log("\nAll browsers authenticated.");

}

run();