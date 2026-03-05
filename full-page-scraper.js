const puppeteer = require("puppeteer-core");
const readline = require("readline-sync");

function delay(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run(){

  const url = readline.question("Enter website URL: ");

  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://localhost:3000"
  });

  const page = await browser.newPage();

  console.log("\nOpening website...\n");

  await page.goto(url,{
    waitUntil:"domcontentloaded"
  });

  await delay(4000);

  const data = await page.evaluate(()=>{

    const title = document.title;

    const headings = Array.from(
      document.querySelectorAll("h1,h2,h3")
    ).map(h => h.innerText);

    const paragraphs = Array.from(
      document.querySelectorAll("p")
    ).map(p => p.innerText);

    const links = Array.from(
      document.querySelectorAll("a")
    ).map(a => a.href);

    return {
      title,
      headings: headings.slice(0,10),
      paragraphs: paragraphs.slice(0,10),
      links: links.slice(0,10)
    };

  });

  console.log("\nPAGE TITLE:\n");
  console.log(data.title);

  console.log("\nHEADINGS:\n");
  data.headings.forEach((h,i)=>{
    console.log(`${i+1}. ${h}`);
  });

  console.log("\nPARAGRAPHS:\n");
  data.paragraphs.forEach((p,i)=>{
    console.log(`${i+1}. ${p}`);
  });

  console.log("\nLINKS:\n");
  data.links.forEach((l,i)=>{
    console.log(`${i+1}. ${l}`);
  });

  const html = `
  <html>
  <body style="font-family:Arial;padding:40px;">
  <h1>Web Page Scraping Report</h1>
  <h2>URL</h2>
  <p>${url}</p>

  <h2>Title</h2>
  <p>${data.title}</p>

  <h2>Headings</h2>
  <ul>${data.headings.map(h=>`<li>${h}</li>`).join("")}</ul>

  <h2>Paragraphs</h2>
  ${data.paragraphs.map(p=>`<p>${p}</p>`).join("")}

  <h2>Links</h2>
  <ul>${data.links.map(l=>`<li>${l}</li>`).join("")}</ul>

  </body>
  </html>
  `;

  const reportPage = await browser.newPage();

  await reportPage.setContent(html);

  await reportPage.pdf({
    path:"scraped-page-report.pdf",
    format:"A4"
  });

  console.log("\nScraping report generated: scraped-page-report.pdf");

  await browser.close();

}

run();