import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const BROWSERLESS = process.env.BROWSERLESS_WS || "ws://localhost:3000/chromium";

// Target URL — change this or pass as CLI arg
const TARGET_URL = process.argv[2] || "https://www.booking.com";

// ── Audit script injected into the page ──────────────────────────────────────
const AUDIT_SCRIPT = `(() => {
  const findings = [];

  // 1. ASYMMETRIC COOKIE BANNER
  // Accept button is huge, Reject is tiny or hidden
  const bannerSelectors = [
    '[class*="cookie"]', '[id*="cookie"]',
    '[class*="consent"]', '[id*="consent"]',
    '[class*="gdpr"]', '[id*="gdpr"]',
    '[class*="CookieBanner"]', '[class*="cookie-banner"]',
  ];
  bannerSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(banner => {
      const buttons = [...banner.querySelectorAll('button, a, [role="button"]')];
      const accept = buttons.find(b => /accept|agree|allow|yes|ok|got it/i.test(b.innerText || ''));
      const reject = buttons.find(b => /reject|decline|refuse|no|only necessary|manage|settings/i.test(b.innerText || ''));
      if (accept && reject) {
        const aSize = accept.offsetWidth * accept.offsetHeight;
        const rSize = reject.offsetWidth * reject.offsetHeight;
        if (aSize > rSize * 2) {
          findings.push({
            type: 'asymmetric_cookie_banner',
            severity: 'HIGH',
            title: 'Asymmetric Cookie Banner',
            description: 'Accept button is more than 2x larger than Reject button — designed to nudge users toward accepting.',
            evidence: {
              acceptText: accept.innerText.trim(),
              rejectText: reject.innerText.trim(),
              acceptArea: aSize,
              rejectArea: rSize,
              ratio: (aSize / rSize).toFixed(1) + 'x larger',
            }
          });
        }
      }
    });
  });

  // 2. FAKE URGENCY / COUNTDOWN TIMERS
  // Timers that exist on page (often fake)
  const timerPatterns = [
    '[class*="countdown"]', '[class*="timer"]', '[id*="countdown"]', '[id*="timer"]',
    '[class*="urgency"]', '[class*="limited"]', '[class*="expires"]',
  ];
  timerPatterns.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      const text = el.innerText || '';
      if (/\\d+.*:.*\\d+|\\d+ (hour|min|sec)/i.test(text)) {
        findings.push({
          type: 'fake_urgency_timer',
          severity: 'HIGH',
          title: 'Urgency / Countdown Timer',
          description: 'Countdown timer detected — often fake or resets on reload to manufacture artificial urgency.',
          evidence: { text: text.trim().slice(0, 100), selector: sel }
        });
      }
    });
  });

  // 3. SCARCITY PRESSURE
  // "Only X left!", "X people viewing", "Selling fast" etc.
  const bodyText = document.body.innerText;
  const scarcityPatterns = [
    { pattern: /only \\d+ left/i, label: 'Low stock warning' },
    { pattern: /\\d+ people (are |)viewing/i, label: 'Social pressure viewer count' },
    { pattern: /selling fast/i, label: '"Selling fast" pressure' },
    { pattern: /\\d+ rooms? left/i, label: 'Low room availability warning' },
    { pattern: /high demand/i, label: 'High demand warning' },
    { pattern: /last (chance|room|seat|ticket)/i, label: 'Last item pressure' },
    { pattern: /\\d+ booked today/i, label: 'Social proof booking pressure' },
    { pattern: /just booked/i, label: 'Real-time booking notification' },
  ];
  scarcityPatterns.forEach(({ pattern, label }) => {
    const match = bodyText.match(pattern);
    if (match) {
      findings.push({
        type: 'scarcity_pressure',
        severity: 'MEDIUM',
        title: 'Scarcity / Social Pressure',
        description: label + ' — may be fabricated to pressure users into faster decisions.',
        evidence: { matchedText: match[0] }
      });
    }
  });

  // 4. PRE-CHECKED BOXES (sneaking items into cart/subscriptions)
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (cb.checked) {
      const label = cb.labels?.[0]?.innerText || 
                    cb.closest('label')?.innerText || 
                    cb.getAttribute('aria-label') || 
                    cb.nextSibling?.textContent || '';
      const labelText = label.trim().slice(0, 150);
      // Only flag if it looks like an add-on, insurance, newsletter, or marketing
      if (/insurance|protect|newsletter|offer|deal|subscription|email|sms|marketing|add.on|extra/i.test(labelText)) {
        findings.push({
          type: 'prechecked_checkbox',
          severity: 'HIGH',
          title: 'Pre-checked Checkbox',
          description: 'A checkbox is pre-checked by default — user must actively opt-out rather than opt-in.',
          evidence: { labelText }
        });
      }
    }
  });

  // 5. HIDDEN / LOW-VISIBILITY OPT-OUT
  // Opt-out links or buttons with very low opacity or tiny font
  const allLinks = [...document.querySelectorAll('a, button, span[role="button"]')];
  allLinks.forEach(el => {
    const text = el.innerText?.toLowerCase() || '';
    if (/(unsubscribe|opt.out|no thanks|skip|cancel)/i.test(text)) {
      const style = window.getComputedStyle(el);
      const opacity = parseFloat(style.opacity);
      const fontSize = parseFloat(style.fontSize);
      if (opacity < 0.5 || fontSize < 10) {
        findings.push({
          type: 'hidden_optout',
          severity: 'HIGH',
          title: 'Hidden Opt-Out Element',
          description: 'An opt-out option is visually hidden using low opacity or tiny font size.',
          evidence: { text: el.innerText.trim(), opacity, fontSize: fontSize + 'px' }
        });
      }
    }
  });

  // 6. CONFIRM-SHAMING
  // Decline buttons phrased to make user feel bad
  const shamePhrases = [
    /no,? i don'?t want/i,
    /no,? i prefer to pay more/i,
    /no,? i hate (saving|deals|discounts)/i,
    /i don'?t want to save/i,
    /no thanks, i'?ll (risk it|pass|miss out)/i,
    /i don'?t need (protection|help|this)/i,
  ];
  allLinks.forEach(el => {
    const text = el.innerText || '';
    shamePhrases.forEach(pattern => {
      if (pattern.test(text)) {
        findings.push({
          type: 'confirmshaming',
          severity: 'MEDIUM',
          title: 'Confirm-Shaming',
          description: 'Decline button is phrased to make users feel guilty or foolish for opting out.',
          evidence: { text: text.trim().slice(0, 150) }
        });
      }
    });
  });

  // 7. PRICE ANCHORING / FAKE STRIKETHROUGH
  // Original price crossed out next to a "deal" price
  const strikeElements = document.querySelectorAll('s, strike, del, [class*="original-price"], [class*="was-price"], [class*="old-price"], [class*="strikethrough"]');
  if (strikeElements.length > 0) {
    const examples = [...strikeElements].slice(0, 3).map(e => e.innerText.trim()).filter(Boolean);
    if (examples.length > 0) {
      findings.push({
        type: 'price_anchoring',
        severity: 'LOW',
        title: 'Price Anchoring (Strikethrough Prices)',
        description: 'Crossed-out "original" prices found — often inflated reference prices to make the current price seem like a better deal than it is.',
        evidence: { examples }
      });
    }
  }

  // 8. ROACH MOTEL — easy to sign up, hard to cancel
  // Detect if there are signup/subscribe CTAs but no visible cancel/unsubscribe links
  const signupCTAs = allLinks.filter(el => /sign.?up|subscribe|get started|create account|join/i.test(el.innerText || ''));
  const cancelLinks = allLinks.filter(el => /cancel|unsubscribe|delete account|close account/i.test(el.innerText || ''));
  if (signupCTAs.length > 2 && cancelLinks.length === 0) {
    findings.push({
      type: 'roach_motel',
      severity: 'MEDIUM',
      title: 'Roach Motel Pattern',
      description: 'Multiple sign-up CTAs found but no visible cancellation or unsubscribe links on this page.',
      evidence: {
        signupCount: signupCTAs.length,
        cancelCount: 0,
        signupExamples: signupCTAs.slice(0, 3).map(e => e.innerText.trim())
      }
    });
  }

  return findings;
})()`;

// ── Main runner ───────────────────────────────────────────────────────────────
async function runAudit(url) {
  console.log(`\n🔍 Dark Pattern Detector`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎯 Target: ${url}`);
  console.log(`⏳ Connecting to browserless...\n`);

  let browser;
  try {
    browser = await puppeteer.connect({ browserWSEndpoint: BROWSERLESS });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1440, height: 900 });

    // Intercept and log suspicious network calls (tracking/analytics)
    const suspiciousRequests = [];
    await page.setRequestInterception(true);
    page.on('request', req => {
      const u = req.url();
      if (/doubleclick|facebook\.com\/tr|google-analytics|hotjar|mouseflow|fullstory|heap\.io|mixpanel/i.test(u)) {
        suspiciousRequests.push({ type: req.resourceType(), url: u.slice(0, 120) });
      }
      req.continue();
    });

    console.log(`🌐 Navigating...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000)); // let dynamic content render

    const pageTitle = await page.title();
    const finalUrl = page.url();
    console.log(`📄 Page: ${pageTitle}`);

    // Run the audit
    console.log(`🧪 Running dark pattern audit...`);
    const findings = await page.evaluate(new Function(`return ${AUDIT_SCRIPT}`));

    // Take full-page screenshot
    console.log(`📸 Capturing screenshot...`);
    const screenshot = await page.screenshot({ fullPage: true, encoding: 'base64' });

    // Capture rendered HTML
    const html = await page.content();

    await browser.close();

    // ── Save results ────────────────────────────────────────────────────────
    const domain = new URL(url).hostname.replace('www.', '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outDir = `./evidence_${domain}_${timestamp}`;
    fs.mkdirSync(outDir, { recursive: true });

    // Screenshot
    fs.writeFileSync(path.join(outDir, 'screenshot.png'), Buffer.from(screenshot, 'base64'));

    // HTML
    fs.writeFileSync(path.join(outDir, 'page.html'), html);

    // Report JSON
    const report = {
      meta: {
        url,
        finalUrl,
        pageTitle,
        auditedAt: new Date().toISOString(),
        tool: 'Dark Pattern Detector (browserless + Puppeteer)',
      },
      summary: {
        totalFindings: findings.length,
        high: findings.filter(f => f.severity === 'HIGH').length,
        medium: findings.filter(f => f.severity === 'MEDIUM').length,
        low: findings.filter(f => f.severity === 'LOW').length,
        trackersDetected: suspiciousRequests.length,
      },
      findings,
      trackers: suspiciousRequests,
    };
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

    // Human-readable summary
    let summary = `DARK PATTERN AUDIT REPORT\n`;
    summary += `${'='.repeat(50)}\n`;
    summary += `URL:        ${url}\n`;
    summary += `Page:       ${pageTitle}\n`;
    summary += `Audited:    ${new Date().toLocaleString()}\n`;
    summary += `${'='.repeat(50)}\n\n`;
    summary += `FINDINGS: ${findings.length} dark patterns detected\n`;
    summary += `  🔴 HIGH:   ${report.summary.high}\n`;
    summary += `  🟡 MEDIUM: ${report.summary.medium}\n`;
    summary += `  🟢 LOW:    ${report.summary.low}\n`;
    summary += `  👁️  TRACKERS: ${suspiciousRequests.length} surveillance scripts\n\n`;
    summary += `${'─'.repeat(50)}\n\n`;

    findings.forEach((f, i) => {
      const icon = f.severity === 'HIGH' ? '🔴' : f.severity === 'MEDIUM' ? '🟡' : '🟢';
      summary += `${i + 1}. ${icon} [${f.severity}] ${f.title}\n`;
      summary += `   ${f.description}\n`;
      if (f.evidence) {
        Object.entries(f.evidence).forEach(([k, v]) => {
          summary += `   • ${k}: ${JSON.stringify(v).slice(0, 100)}\n`;
        });
      }
      summary += `\n`;
    });

    if (suspiciousRequests.length > 0) {
      summary += `${'─'.repeat(50)}\n`;
      summary += `SURVEILLANCE TRACKERS DETECTED:\n`;
      suspiciousRequests.slice(0, 10).forEach(r => {
        summary += `  • ${r.url}\n`;
      });
    }

    fs.writeFileSync(path.join(outDir, 'summary.txt'), summary);

    // ── Print to console ────────────────────────────────────────────────────
    console.log(`\n${'━'.repeat(50)}`);
    console.log(`✅ Audit complete!\n`);
    console.log(summary);
    console.log(`${'━'.repeat(50)}`);
    console.log(`📁 Evidence saved to: ${outDir}/`);
    console.log(`   ├── screenshot.png`);
    console.log(`   ├── page.html`);
    console.log(`   ├── report.json`);
    console.log(`   └── summary.txt\n`);

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

runAudit(TARGET_URL);