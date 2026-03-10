import express from "express";
import puppeteer from "puppeteer-core";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const BROWSERLESS = process.env.BROWSERLESS_WS || "ws://localhost:3000/chromium";

const PROBES = [
  {
    id: 'us',
    label: 'USA',
    icon: '🇺🇸',
    description: 'Steam US store — base USD price',
    country: 'US',
    steamCountry: 'US%7C%7C',
  },
  {
    id: 'in',
    label: 'India',
    icon: '🇮🇳',
    description: 'Steam India store — often 50-80% cheaper',
    country: 'IN',
    steamCountry: 'IN%7C%7C',
  },
  {
    id: 'tr',
    label: 'Turkey',
    icon: '🇹🇷',
    description: 'Steam Turkey — historically cheapest region',
    country: 'TR',
    steamCountry: 'TR%7C%7C',
  },
  {
    id: 'ar',
    label: 'Argentina',
    icon: '🇦🇷',
    description: 'Steam Argentina — very low USD equivalent',
    country: 'AR',
    steamCountry: 'AR%7C%7C',
  },
];

async function extractSteamPrice(page) {
  try {
    await page.waitForSelector('.game_purchase_price, .discount_final_price', { timeout: 8000 });
  } catch {}

  const steamSelectors = ['.game_purchase_price', '.discount_final_price', '.price'];
  for (const sel of steamSelectors) {
    try {
      const text = await page.$eval(sel, el => el.innerText?.trim());
      if (text && text.length > 0) return { price: text, selector: sel };
    } catch {}
  }

  // Full text scan for any currency
  const bodyText = await page.evaluate(() => document.body.innerText);
  const patterns = [
    /US\$\s?[\d,]+\.?\d*/,
    /₺\s?[\d,.]+/,
    /₹\s?[\d,.]+/,
    /\$\s?[\d,]+\.?\d*/,
    /€\s?[\d,]+\.?\d*/,
    /£\s?[\d,]+\.?\d*/,
    /[\d,.]+\s*TL/,
    /ARS\s*[\d,.]+/,
  ];
  for (const pattern of patterns) {
    const match = bodyText.match(pattern);
    if (match) return { price: match[0].trim(), selector: 'text-scan' };
  }

  return null;
}

function toUSD(priceStr, probeId) {
  if (!priceStr) return null;
  const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return null;
  const rates = { us: 1, in: 0.012, tr: 0.031, ar: 0.001 };
  return (num * (rates[probeId] || 1)).toFixed(2);
}

async function runSteamProbe(appId, probe) {
  let browser;
  try {
    browser = await puppeteer.connect({ browserWSEndpoint: BROWSERLESS });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1440, height: 900 });

    await page.setCookie(
      { name: 'steamCountry', value: probe.steamCountry, domain: 'store.steampowered.com', path: '/' },
      { name: 'Steam_Language', value: 'english', domain: 'store.steampowered.com', path: '/' }
    );

    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'media', 'font'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    const url = `https://store.steampowered.com/app/${appId}/?cc=${probe.country.toLowerCase()}`;
    const start = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Handle age gate
    try {
      const ageGate = await page.$('#ageYear');
      if (ageGate) {
        await page.select('#ageYear', '1990');
        await page.click('#view_product_page_btn');
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch {}

    await new Promise(r => setTimeout(r, 3000));

    const title = await page.title();
    const priceData = await extractSteamPrice(page);
    const loadTime = Date.now() - start;
    const screenshot = await page.screenshot({ encoding: 'base64', clip: { x: 0, y: 0, width: 1440, height: 600 } });

    await browser.close();
    return { success: true, price: priceData?.price || null, title, loadTime, screenshot, url };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return { success: false, error: err.message, price: null };
  }
}

app.post('/api/detect', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  let appId;
  const match = url.match(/\/app\/(\d+)/);
  if (match) appId = match[1];
  else if (/^\d+$/.test(url.trim())) appId = url.trim();
  else return res.status(400).json({ error: 'Enter a Steam URL like https://store.steampowered.com/app/570' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  send({ type: 'start', appId, probes: PROBES.map(p => ({ id: p.id, label: p.label, icon: p.icon, description: p.description })) });

  const results = [];

  for (const probe of PROBES) {
    send({ type: 'probe_start', id: probe.id });
    const result = await runSteamProbe(appId, probe);
    const usdEquiv = toUSD(result.price, probe.id);
    results.push({ ...probe, ...result, usdEquiv });
    send({ type: 'probe_done', id: probe.id, result: { success: result.success, price: result.price, usdEquiv, title: result.title, loadTime: result.loadTime, error: result.error, url: result.url } });
    send({ type: 'probe_screenshot', id: probe.id, screenshot: result.screenshot });
  }

  const withPrices = results.filter(r => r.price);
  const usResult = results.find(r => r.id === 'us');
  const cheapest = results.filter(r => r.usdEquiv).sort((a, b) => parseFloat(a.usdEquiv) - parseFloat(b.usdEquiv))[0];
  const usPriceUSD = parseFloat(usResult?.usdEquiv || 0);
  const cheapestUSD = parseFloat(cheapest?.usdEquiv || 0);
  const savings = usPriceUSD > 0 && cheapestUSD > 0 ? Math.round((1 - cheapestUSD / usPriceUSD) * 100) : 0;

  let verdict, verdictDetail;
  if (withPrices.length === 0) {
    verdict = 'ERROR'; verdictDetail = 'Could not extract prices. Game may be free, unreleased, or region-locked.';
  } else if (savings >= 70) {
    verdict = 'MASSIVE'; verdictDetail = `${cheapest?.label} is ${savings}% cheaper than US in USD equivalent!`;
  } else if (savings >= 30) {
    verdict = 'SIGNIFICANT'; verdictDetail = `${cheapest?.label} offers ${savings}% savings vs US price.`;
  } else if (savings > 0) {
    verdict = 'MINOR'; verdictDetail = `Prices vary slightly across regions (~${savings}% spread).`;
  } else {
    verdict = 'UNIFORM'; verdictDetail = 'Same price across all regions.';
  }

  send({
    type: 'analysis',
    verdict, verdictDetail, savings,
    cheapestRegion: cheapest?.label || null,
    summary: results.map(r => ({ id: r.id, label: r.label, icon: r.icon, price: r.price, usdEquiv: r.usdEquiv, loadTime: r.loadTime, success: r.success, error: r.error, url: r.url })),
  });

  send({ type: 'done' });
  res.end();
});

app.listen(4000, () => {
  console.log('\n🎮 Steam Regional Price Detector running!');
  console.log('👉 Open: http://localhost:4000\n');
});