const puppeteer = require("puppeteer-core");

async function takeScreenshot() {

  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://localhost:3000"
  });

  const page = await browser.newPage();

  console.log("Opening OpenAI website...");

  await page.goto("https://openai.com");

  await page.screenshot({
    path: "openai.png",
    fullPage: true
  });

  console.log("Screenshot saved as openai.png");

  await browser.close();
}

takeScreenshot();