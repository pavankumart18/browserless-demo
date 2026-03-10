const TOKEN = process.env.BROWSERLESS_TOKEN;
if (!TOKEN) {
  throw new Error("Missing BROWSERLESS_TOKEN env var (required for Browserless Cloud)");
}
const ENDPOINT = `https://production-sfo.browserless.io/stealth/bql?token=${TOKEN}`;

const mutation = `
mutation SolveCaptcha {
  goto(url: "https://nowsecure.nl", waitUntil: networkIdle) {
    status
    time
  }
  before: screenshot(fullPage: true) {
    base64
  }
  verify(type: cloudflare) {
    found
    solved
    time
  }
  wait1: waitForTimeout(time: 5000) {
    time
  }
  after: screenshot(fullPage: true) {
    base64
  }
}
`;

async function main() {
  console.log("Sending BrowserQL mutation...");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: mutation }),
  });

  console.log("HTTP status:", res.status);
  const json = await res.json();

  if (json.errors) {
    console.error("Errors:", json.errors);
    return;
  }

  console.log("Full response:", JSON.stringify(json.data, null, 2));

  const { goto, before, after, verify } = json.data;

  console.log(`Page loaded: HTTP ${goto.status} in ${goto.time}ms`);

  if (verify) {
    console.log(`CAPTCHA found: ${verify.found}`);
    console.log(`CAPTCHA solved: ${verify.solved} in ${verify.time}ms`);
  } else {
    console.log("No CAPTCHA challenge detected (stealth bypassed it!)");
  }

  const fs = await import("fs");

  if (before?.base64) {
    fs.writeFileSync("before.png", Buffer.from(before.base64, "base64"));
    console.log("Screenshot saved → before.png");
  }

  if (after?.base64) {
    fs.writeFileSync("after.png", Buffer.from(after.base64, "base64"));
    console.log("Screenshot saved → after.png");
  }
}

main();