const TOKEN = process.env.BROWSERLESS_TOKEN;
if (!TOKEN) {
  throw new Error("Missing BROWSERLESS_TOKEN env var (required for Browserless Cloud)");
}

const countries = [
  { code: "us", label: "United States 🇺🇸" },
  { code: "gb", label: "United Kingdom 🇬🇧" },
  { code: "in", label: "India 🇮🇳" },
];

const mutation = `
mutation GeoCapture {
  goto(url: "https://www.booking.com/searchresults.html?ss=New+York&checkin=2025-06-01&checkout=2025-06-02&group_adults=2", waitUntil: networkIdle) {
    status
    time
  }
  screenshot(fullPage: false) {
    base64
  }
  html {
    html
  }
}
`;

async function fetchForCountry(country) {
  // proxy country passed as URL query param — correct way
  const params = new URLSearchParams({
    token: TOKEN,
    proxy: "residential",
    proxyCountry: country.code,
  });

  const endpoint = `https://production-sfo.browserless.io/stealth/bql?${params}`;

  console.log(`🌍 Fetching for ${country.label}...`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: mutation }),
  });

  const text = await res.text();

  if (res.status !== 200) {
    console.error(`❌ ${country.label} HTTP ${res.status}:`, text.slice(0, 300));
    return null;
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error(`❌ ${country.label} bad JSON:`, text.slice(0, 300));
    return null;
  }

  if (json.errors) {
    console.error(`❌ ${country.label} errors:`, json.errors);
    return null;
  }

  return { country, data: json.data };
}

function extractPrices(html) {
  const matches = html.match(/[\$£₹€]\s?[\d,]+/g);
  return matches ? [...new Set(matches)].slice(0, 8) : ["No prices found"];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Running geo price intelligence across 3 countries...\n");

  const results = [];

  for (const country of countries) {
    const result = await fetchForCountry(country);
    results.push(result);
    await sleep(3000);
  }

  const fs = await import("fs");

  console.log("\n📊 RESULTS:\n");
  console.log("=".repeat(50));

  for (const result of results) {
    if (!result) continue;

    const { country, data } = result;
    const prices = extractPrices(data.html?.html || "");
    const loadTime = data.goto?.time;

    console.log(`\n${country.label}`);
    console.log(`  Load time : ${loadTime}ms`);
    console.log(`  Prices    : ${prices.join("  |  ")}`);

    if (data.screenshot?.base64) {
      const filename = `geo_${country.code}.png`;
      fs.writeFileSync(filename, Buffer.from(data.screenshot.base64, "base64"));
      console.log(`  Screenshot: ${filename}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("\n✅ Done. Open geo_us.png, geo_gb.png, geo_in.png to compare.");
}

main();