const TOKEN = process.env.BROWSERLESS_TOKEN;
if (!TOKEN) {
  throw new Error("Missing BROWSERLESS_TOKEN env var (required for Browserless Cloud)");
}
const ENDPOINT = `https://production-sfo.browserless.io/stealth/bql?token=${TOKEN}`;
const mutation = `
mutation SolveCaptcha {
  goto(url: "https://accounts.hcaptcha.com/demo", waitUntil: networkIdle) {
    status
    time
  }
  before: screenshot(fullPage: true) {
    base64
  }
  solve(type: hcaptcha) {
    found
    solved
    time
  }
  wait1: waitForTimeout(time: 3000) {
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

  const { goto, solve, before, after } = json.data;

  console.log(`Page loaded: HTTP ${goto.status} in ${goto.time}ms`);
  console.log(`CAPTCHA found: ${solve.found}`);
  console.log(`CAPTCHA solved: ${solve.solved} in ${solve.time}ms`);

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