#!/usr/bin/env node
/*
 Headless smoke test to boot /#__polish and fail on console errors.
*/
const { chromium } = require('playwright');

async function main() {
  const url = process.env.PREVIEW_URL || 'http://localhost:5173/#/__polish?overlay=1';
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--disable-gpu-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror:' + e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console:' + msg.text()); });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#polish-overlay', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  if (errors.length) {
    console.error(errors.join('\n'));
    await browser.close();
    process.exit(1);
  }
  await browser.close();
  console.log('smoke:polish OK');
}

main().catch((err) => { console.error(err); process.exit(1); });
