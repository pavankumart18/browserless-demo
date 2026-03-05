const puppeteer = require("puppeteer-core");
const readline = require("readline-sync");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {

  const query = readline.question("Research topic: ");

  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://localhost:3000"
  });

  const page = await browser.newPage();

  console.log("\nSearching DuckDuckGo...\n");

  await page.goto(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    { waitUntil: "domcontentloaded" }
  );

  // wait for content to render
  await delay(5000);

  const links = await page.evaluate(() => {

    const results = [];
    const elements = document.querySelectorAll("a");

    elements.forEach(el => {
      const href = el.href;
      const text = el.innerText;

      if (
        href &&
        text &&
        href.startsWith("http") &&
        !href.includes("duckduckgo")
      ) {
        results.push({
          title: text,
          url: href
        });
      }
    });

    return results.slice(0,3);
  });

  console.log("\nTop Sources:\n");

  links.forEach((l,i)=>{
    console.log(`${i+1}. ${l.title}`);
  });

  let researchData = [];

  for (const link of links) {

    const newPage = await browser.newPage();

    console.log(`\nOpening: ${link.title}`);

    try {

      await newPage.goto(link.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });

      await delay(3000);

      const paragraphs = await newPage.$$eval(
        "p",
        ps => ps.slice(0,5).map(p => p.innerText)
      );

      researchData.push({
        title: link.title,
        url: link.url,
        paragraphs
      });

    } catch (err) {

      console.log("Failed:", link.url);

    }

    await newPage.close();
  }

  console.log("\nGenerating research report...\n");

  let html = `
  <html>
  <body style="font-family:Arial;padding:40px;">
  <h1>Autonomous Research Report</h1>
  <h2>Topic: ${query}</h2>
  `;

  researchData.forEach(site => {

    html += `
    <h3>${site.title}</h3>
    <p><b>Source:</b> ${site.url}</p>
    ${site.paragraphs.map(p=>`<p>${p}</p>`).join("")}
    <hr/>
    `;

  });

  html += "</body></html>";

  const reportPage = await browser.newPage();

  await reportPage.setContent(html);

  await reportPage.pdf({
    path: "research-report.pdf",
    format: "A4"
  });

  console.log("\nResearch report generated: research-report.pdf");

  await browser.close();
}

run();