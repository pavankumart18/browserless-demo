const puppeteer = require("puppeteer-core");

async function runDemo() {

  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://localhost:3000"
  });

  const page = await browser.newPage();

  console.log("Opening Hacker News...");

  await page.goto("https://news.ycombinator.com");

  const titles = await page.$$eval(".titleline > a", links =>
    links.slice(0, 5).map(link => link.innerText)
  );

  console.log("\nTop Hacker News Headlines:\n");

  titles.forEach((title, index) => {
    console.log(`${index + 1}. ${title}`);
  });

  await browser.close();
}

runDemo();