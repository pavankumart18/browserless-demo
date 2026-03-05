const puppeteer = require("puppeteer-core");
const readline = require("readline-sync");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForChatInput(page) {

  for (let i = 0; i < 10; i++) {

    const input = await page.$("textarea");

    if (input) return input;

    console.log("Waiting for ChatGPT input UI...");
    await delay(3000);
  }

  throw new Error("ChatGPT input box not found");
}

async function run() {

  const question = readline.question("Ask ChatGPT: ");

  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://localhost:3000"
  });

  const page = await browser.newPage();

  console.log("\nOpening ChatGPT...\n");

  await page.goto("https://chatgpt.com", {
    waitUntil: "domcontentloaded",
    timeout: 120000
  });

  await delay(8000);

  const input = await waitForChatInput(page);

  console.log("Typing question...\n");

  await input.click();
  await page.keyboard.type(question, { delay: 50 });

  await page.keyboard.press("Enter");

  console.log("Waiting for response...\n");

  await delay(15000);

  const answer = await page.evaluate(() => {
    const msgs = document.querySelectorAll("[data-message-author-role='assistant']");
    if (!msgs.length) return "No response found";
    return msgs[msgs.length - 1].innerText;
  });

  console.log("\nAI Response:\n");
  console.log(answer);

  const html = `
  <html>
  <body style="font-family:Arial;padding:40px;">
  <h1>ChatGPT Result</h1>
  <h2>Question</h2>
  <p>${question}</p>
  <h2>Answer</h2>
  <p>${answer}</p>
  </body>
  </html>
  `;

  await page.setContent(html);

  await page.pdf({
    path: "chatgpt-response.pdf",
    format: "A4"
  });

  console.log("\nPDF generated: chatgpt-response.pdf");

  await browser.close();
}

run();