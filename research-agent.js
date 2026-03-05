const puppeteer = require("puppeteer-core");
const readline = require("readline-sync");

async function run() {

  const query = readline.question("Research topic: ");

  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://localhost:3000"
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  console.log("\nSearching DuckDuckGo...\n");

  await page.goto(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    { waitUntil: "networkidle2" }
  );

  await page.waitForSelector("a[data-testid='result-title-a']");

  const results = await page.$$eval(
    "a[data-testid='result-title-a']",
    els => els.slice(0, 5).map(e => e.innerText)
  );

  console.log("\nTop Results:\n");

  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r}`);
  });

  const html = `
  <html>
  <body style="font-family:Arial;padding:40px;">
  <h1>Research Results</h1>
  <h2>Topic</h2>
  <p>${query}</p>
  <h2>Top Results</h2>
  <ul>
  ${results.map(r => `<li>${r}</li>`).join("")}
  </ul>
  </body>
  </html>
  `;

  await page.setContent(html);

  await page.pdf({
    path: "research-report.pdf",
    format: "A4"
  });

  console.log("\nPDF generated: research-report.pdf");

  await browser.close();
}

run();