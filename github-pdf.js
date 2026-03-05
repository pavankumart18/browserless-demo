const puppeteer = require("puppeteer-core");

async function run() {

  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://localhost:3000"
  });

  const page = await browser.newPage();

  console.log("Opening GitHub profile...");

  await page.goto("https://github.com/pavankumart18", {
    waitUntil: "networkidle2"
  });

  await page.pdf({
    path: "github-profile.pdf",
    format: "A4"
  });

  console.log("PDF saved: github-profile.pdf");

  await browser.close();
}

run();