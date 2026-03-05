const puppeteer = require("puppeteer-core");

async function run() {

  const profiles = [
    "https://github.com/pavankumart18",
    "https://github.com/torvalds",
    "https://github.com/openai"
  ];

  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://localhost:3000"
  });

  for (let url of profiles) {

    const page = await browser.newPage();

    console.log("Opening:", url);

    await page.goto(url, { waitUntil: "networkidle2" });

    const username = url.split("/").pop();

    await page.screenshot({
      path: `${username}.png`,
      fullPage: true
    });

    console.log("Saved:", `${username}.png`);

    await page.close();
  }

  await browser.close();
}

run();