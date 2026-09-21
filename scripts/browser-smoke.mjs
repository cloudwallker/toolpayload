import { chromium } from 'playwright';
import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { analyzeResult } from '../dist/analyze.js';
import { renderReport } from '../dist/report.js';
import { compareCases, createBaseline } from '../dist/compare.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const demo = spawnSync(process.execPath, [join(root, 'scripts/demo.mjs')], { cwd: root, encoding: 'utf8' });
assert.equal(demo.status, 0, demo.stderr);
const launch = { headless: true };
if (process.env.TOOLPAYLOAD_BROWSER_PATH) launch.executablePath = process.env.TOOLPAYLOAD_BROWSER_PATH;
else {
  try { await access(chromium.executablePath()); }
  catch {
    if (process.platform === 'win32') launch.channel = 'msedge';
    else throw new Error('Install Chromium with npm exec -- playwright install chromium, or set TOOLPAYLOAD_BROWSER_PATH.');
  }
}
const browser = await chromium.launch(launch);
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const requests = [];
  await context.route('**/*', route => {
    if (/^https?:/.test(route.request().url())) { requests.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(join(root, 'artifacts/demo-report.html')).href);
  await page.waitForSelector('.case-card');
  assert.equal(await page.locator('.case-card').count(), 2);
  assert.equal(await page.locator('#report-status').textContent(), 'fail');
  await page.locator('#fail-only').check();
  assert.equal(await page.locator('.case-card').count(), 1);
  assert.equal(await page.locator('.case-name').textContent(), 'search');
  await page.locator('#fail-only').uncheck();
  await page.locator('#case-search').fill('multimodal');
  assert.equal(await page.locator('.case-card').count(), 1);
  await page.locator('#case-search').fill('does-not-exist');
  assert(await page.locator('#empty-state').isVisible());
  await page.locator('#case-search').fill('');
  await page.locator('#case-sort').selectOption('name');
  assert.deepEqual(await page.locator('.case-name').allTextContents(), ['multimodal', 'search']);
  await page.locator('#case-sort').selectOption('growth-desc');
  assert.equal(await page.locator('.case-name').first().textContent(), 'search');
  await page.locator('.details-toggle').first().click();
  assert(await page.locator('.case-detail').first().isVisible());
  await page.locator('.field-node > summary').first().click();
  assert(await page.locator('.field-children').first().isVisible());
  await page.screenshot({ path: join(root, 'artifacts/report-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile report overflows horizontally');
  await page.screenshot({ path: join(root, 'artifacts/report-mobile.png'), fullPage: true });

  // Drive the same real browser with adversarial case IDs/field names and removed cases.
  const evil = '</script><img src=https://invalid.test/x onerror=globalThis.PWNED=true>';
  const normal = analyzeResult({ content: [{ type: 'text', text: 'PRIVATE_NEVER_EXPORTED' }], structuredContent: { [evil]: 'SECRET_VALUE' } });
  const withDebug = analyzeResult({ content: [{ type: 'text', text: 'PRIVATE_NEVER_EXPORTED' }], debug: 'x'.repeat(10000) });
  const clean = analyzeResult({ content: [{ type: 'text', text: 'PRIVATE_NEVER_EXPORTED' }] });
  const baseline = createBaseline([{ id: 'delete-debug', analysis: withDebug }, { id: 'missing', analysis: normal }]);
  const budget = { maxResultBytes: 65536, maxGrowthPercent: 20 };
  const report = compareCases([{ id: evil, analysis: normal, budget }, { id: 'delete-debug', analysis: clean, budget }], baseline);
  const hostileFile = join(root, 'artifacts/adversarial-report.html');
  const html = renderReport(report, 'html');
  assert(!html.includes('SECRET_VALUE') && !html.includes('PRIVATE_NEVER_EXPORTED'));
  await writeFile(hostileFile, html);
  await page.goto(pathToFileURL(hostileFile).href);
  await page.waitForSelector('.case-card');
  assert.equal(await page.locator('.case-card').count(), 3);
  assert.equal(await page.evaluate(() => globalThis.PWNED), undefined);
  assert.equal(await page.locator('img').count(), 0);
  const deletedCard = page.locator('.case-card').filter({ has: page.locator('.case-name', { hasText: 'delete-debug' }) });
  assert.match(await deletedCard.locator('.insight-line').textContent(), /\/debug/);
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  await mkdir(join(root, 'artifacts'), { recursive: true });
  await writeFile(join(root, 'artifacts/browser-verification.json'), JSON.stringify({
    browser: await browser.version(), desktop: '1440x1100', mobile: '390x844',
    cases: ['filter', 'sort', 'expand', 'mobile layout', 'deleted fields', 'missing case', 'injection', 'no network'],
    errors, networkRequests: requests,
  }, null, 2));
  console.log('Browser checks passed: filtering, sorting, field trees, mobile layout, XSS, deleted fields, and zero network requests.');
} finally {
  await browser.close();
}
