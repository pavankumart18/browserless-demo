import puppeteer from "puppeteer-core";

const WS_ENDPOINT = process.env.BROWSERLESS_WS || "ws://localhost:3000/chromium";

console.log("Connecting...");

const browser = await puppeteer.connect({
  browserWSEndpoint: WS_ENDPOINT,
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

// Get the page target ID to build a devtools URL
const target = page.target();
const targetId = target._targetId;

console.log("\n🎥 Open this in Chrome to see the live browser:");
console.log(`\n   http://localhost:3000/devtools/inspector.html?ws=localhost:3000/devtools/page/${targetId}\n`);

await page.goto("https://www.google.com", { waitUntil: "networkidle0" });

console.log("⏳ Keeping open 60s — interact via the URL above!");
await new Promise((r) => setTimeout(r, 60000));

await browser.close();
