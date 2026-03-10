const TOKEN = process.env.BROWSERLESS_TOKEN;
if (!TOKEN) {
  throw new Error("Missing BROWSERLESS_TOKEN env var (required for Browserless Cloud)");
}
const ENDPOINT = `https://production-sfo.browserless.io/function?token=${TOKEN}`;

const code = `
export default async ({ page, context }) => {
  await page.goto(context.url, { waitUntil: "networkidle2" });

  const data = await page.evaluate(() => {
    return {
      title: document.title,
      h1: document.querySelector("h1")?.innerText || null,
      metaDescription: document.querySelector('meta[name="description"]')?.content || null,
      linkCount: document.querySelectorAll("a").length,
      imageCount: document.querySelectorAll("img").length,
      wordCount: document.body.innerText.split(/\\s+/).length,
    };
  });

  return {
    data,
    type: "application/json",
  };
};
`;

async function main() {
  const targetUrl = "https://news.ycombinator.com";

  console.log(`🚀 Running serverless browser function against: ${targetUrl}`);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      context: { url: targetUrl },
    }),
  });

  console.log("HTTP status:", res.status);

  // print raw response first
  const text = await res.text();
  console.log("Raw response:", text.slice(0, 500));

  // then parse
  try {
    const result = JSON.parse(text);
    console.log("\n✅ Parsed result:");
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log("Could not parse as JSON");
  }
}

main();