const puppeteer = require("puppeteer-core");

async function captureGithub() {

  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://localhost:3000"
  });

  const page = await browser.newPage();

  console.log("Opening Pavan Kumar's GitHub profile...");

  await page.goto("https://github.com/pavankumart18", {
    waitUntil: "networkidle2"
  });

  await page.setViewport({ width: 1280, height: 800 });

  await page.screenshot({
    path: "pavan-github.png",
    fullPage: true
  });

  console.log("Screenshot saved as pavan-github.png");

  await browser.close();
}

captureGithub();