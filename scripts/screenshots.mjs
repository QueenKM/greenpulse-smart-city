import assert from 'node:assert/strict';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from 'playwright/test';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'docs/presentation-assets');
const filenames = [
  '01_KPI_Impact_Overview.png',
  '02_K1_Calculation_Assumptions.png',
  '03_K1_Scenario_Comparison.png',
  '04_Human_Approval_Drawer.png',
  '05_Decision_Log_Completed.png',
];
const BASE = Date.parse('2026-11-18T08:00:00Z');
const disclaimer = 'Illustrative values used to demonstrate the KPI calculation. The real baseline will be established during pilot preparation.';
let server, browser, page;
let stage = 'setup';
const pageErrors = [];

async function executable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  for (const path of [chromium.executablePath(), '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) {
    try { await access(path, constants.X_OK); return path; } catch { /* Try the next installed Chromium. */ }
  }
  throw new Error('Chromium is unavailable. Run npx playwright install --with-deps chromium, then npm run screenshots. Alternatively set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to an installed Chromium.');
}

async function visible(locator) {
  await expect(locator.first()).toBeVisible({ timeout: 30000 });
  // Playwright visibility alone does not guarantee the text is inside its scroll viewport.
  await expect.poll(async () => locator.first().evaluate(element => {
    const box = element.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0 || box.left < 0 || box.top < 0 || box.right > innerWidth + 1 || box.bottom > innerHeight + 1) return false;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (/(auto|hidden|scroll|clip)/.test(getComputedStyle(parent).overflowY)) {
        const bounds = parent.getBoundingClientRect();
        if (box.bottom > bounds.bottom + 1 || box.top < bounds.top - 1) return false;
      }
    }
    return true;
  }), { message: 'Required screenshot text must be fully inside the visible viewport.' }).toBe(true);
}

async function settle(page, { map = false } = {}) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => { await document.fonts.ready; });
  await expect(page.locator('.geo-loading')).toHaveCount(0, { timeout: 30000 });
  if (map) {
    await expect(page.locator('.geo-map svg').first()).toBeVisible({ timeout: 30000 });
    assert.ok(await page.locator('.geo-map svg path').count() > 100, 'The real geographic model must render, not an empty placeholder.');
  }
  await page.waitForTimeout(900); // Finish Framer Motion's requestAnimationFrame transitions.
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getTiming().iterations !== Infinity) { try { animation.finish(); } catch {} }
    }
  });
  await page.mouse.move(1908, 1068);
  // Blur focus rings left by pointer navigation without changing application content.
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.waitForTimeout(500); // Let the auto-hide sidebar settle after the cursor leaves.
}

function verifyPng(buffer, filename) {
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filename}: valid PNG signature`);
  assert.equal(buffer.readUInt32BE(16), 1920, `${filename}: width`);
  assert.equal(buffer.readUInt32BE(20), 1080, `${filename}: height`);
  assert.ok(buffer.length > 40000, `${filename}: screenshot must contain rendered UI`);
}

async function capture(page, index, required, options) {
  stage = filenames[index];
  await settle(page, options);
  for (const locator of required) await visible(locator);
  await visible(page.getByText('TARGET-STATE PROTOTYPE', { exact: true }));
  assert.deepEqual(pageErrors, [], 'No JavaScript rendering errors are allowed.');
  const image = await page.screenshot({ animations: 'disabled', caret: 'hide', fullPage: false, type: 'png' });
  verifyPng(image, filenames[index]);
  await writeFile(resolve(output, filenames[index]), image);
  console.log(`${filenames[index]} — 1920x1080`);
}

async function navigate(page, name) {
  const item = page.locator('.sidebar').getByRole('button', { name, exact: true });
  await item.click();
  await expect(page.locator('.page-heading h1')).toHaveText(name);
}

try {
  await mkdir(output, { recursive: true });
  let url = process.env.GREENPULSE_SCREENSHOT_URL;
  if (!url) {
    server = await createServer({ root, server: { host: '127.0.0.1', port: 4175, strictPort: true }, clearScreen: false });
    await server.listen();
    url = `http://127.0.0.1:4175${server.config.base}`;
  }
  browser = await chromium.launch({ executablePath: await executable(), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  console.log(`Chromium ${browser.version()} · ${url}`);
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'reduce', locale: 'en-GB', timezoneId: 'Europe/Sofia' });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.clock.setFixedTime(new Date(BASE)); // Deterministic demo clock; timers still run normally.
  await page.goto(url, { waitUntil: 'networkidle' });
  await expect(page.locator('.page-heading h1')).toHaveText('Overview');
  await settle(page, { map: true });

  stage = 'KPI overview';
  await navigate(page, 'KPI Framework');
  const kpiList = page.getByRole('navigation', { name: 'KPI selector' });
  await expect(kpiList.getByRole('button')).toHaveCount(7);
  const kpiNames = [
    'Pilot corridor travel time and delay', 'Estimated tailpipe CO₂ avoided', 'Measured NO₂ and PM2.5', 'Alert-to-decision time', 'Heat exposure in person-hours', 'Vulnerable residents within reach of cooling points', 'Decisions fully recorded',
  ];
  for (const [index, name] of kpiNames.entries()) await expect(kpiList.getByRole('button').nth(index)).toContainText(name);
  await capture(page, 0, [page.getByRole('heading', { name: 'Seven indicators. Explicit evidence.' }), ...kpiNames.map((name, index) => kpiList.getByRole('button', { name: new RegExp(`^K${index + 1}\\b`) })), ...['PILOT', 'PILOT-READY', 'TARGET', 'MEASURED', 'ESTIMATED', 'MODELLED'].map(label => kpiList.getByText(new RegExp(label)).first()), page.locator('.kw-actual-summary').getByText('No data', { exact: true })]);

  stage = 'K1 calculation and assumptions';
  await navigate(page, 'Daily Traffic');
  await page.getByRole('tab', { name: 'Pilot KPI example', exact: true }).click();
  await capture(page, 1, [page.getByRole('heading', { name: 'K1 · Pilot corridor travel time and delay', exact: true }), ...['ILLUSTRATIVE BASELINE', 'MODELLED SCENARIO', 'ILLUSTRATIVE IMPROVEMENT'].map(label => page.getByText(label, { exact: true })), page.locator('.tuc-example-values strong').filter({ hasText: '18.0' }), page.locator('.tuc-example-values strong').filter({ hasText: '16.2' }), page.locator('.tuc-example-change strong'), page.locator('.tuc-worked-example code'), page.getByText(disclaimer, { exact: true }), page.getByText(/Requires validated timestamp linkage between selected cameras/)]);
  assert.match(await page.locator('.tuc-example-change strong').innerText(), /10\s*%/);

  stage = 'Scenario comparison';
  await navigate(page, 'Overview');
  await page.getByRole('button', { name: 'Explore target scenarios', exact: true }).click();
  await page.getByRole('button', { name: 'Show forecast in 60 minutes', exact: true }).click();
  await expect(page.getByRole('button', { name: /Scenario B, Adaptive Signals/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await capture(page, 2, [page.locator('.page-heading h1').filter({ hasText: 'Digital Twin' }), ...['Do Nothing', 'Adaptive Signals', 'Traffic Diversion'].map(name => page.locator('.twin-scenarios').getByText(name, { exact: true })), page.getByText(/TARGET · MODELLED \/ SYNTHETIC options/), page.getByRole('button', { name: 'Review & approve', exact: true })], { map: true });

  stage = 'Human approval, before final approval';
  await page.getByRole('button', { name: 'Review & approve', exact: true }).click();
  const approval = page.getByRole('dialog', { name: 'Approve intervention', exact: true });
  for (const name of [
    'Pedestrian safety and crossing delay reviewed', 'Bus punctuality and access reviewed', 'Residential congestion displacement reviewed', 'Historic-centre compatibility reviewed', 'Time-limited trial and rollback plan reviewed', 'Synthetic queue-pattern trigger reviewed; municipal operating threshold remains to be agreed',
  ]) await approval.getByRole('checkbox', { name, exact: true }).check();
  await approval.getByRole('button', { name: 'Record plan review', exact: true }).click();
  await approval.getByLabel(/Acting as the proposed approving authority/).selectOption('Mobility Department');
  await approval.getByRole('checkbox', { name: 'I confirm this synthetic decision as the proposed approving authority', exact: true }).check();
  const approve = approval.getByRole('button', { name: 'Approve intervention', exact: true });
  await expect(approve).toBeEnabled();
  // Keep the reviewed proposal and authority visible, with fixed human controls.
  await approval.locator('.gp-versioned-authority').evaluate(element => { const scroller = element.closest('.gp-dialog-content'); scroller.scrollTop += element.getBoundingClientRect().top - scroller.getBoundingClientRect().top; });
  await capture(page, 3, [approval.getByRole('heading', { name: 'Approve intervention', exact: true }), approval.locator('.gp-versioned-required-authority strong'), approval.getByText(/authorised operator executes separately/), approve, approval.getByRole('button', { name: 'Modify', exact: true }), approval.getByRole('button', { name: 'Cancel', exact: true })], { map: true });

  // The approval click is deliberately after screenshot 04 was written and verified.
  verifyPng(await readFile(resolve(output, filenames[3])), filenames[3]);
  stage = 'Mobility approval and separate authorised execution';
  await page.clock.setFixedTime(new Date(BASE + 2 * 60000));
  await approve.click();
  await expect(page.getByText('APPROVED · AWAITING AUTHORISED EXECUTION', { exact: true })).toBeVisible();
  await expect(page.getByText('MONITORING', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Review authorised execution', exact: true }).click();
  const execution = page.getByRole('dialog', { name: 'Authorised execution', exact: true });
  await execution.getByLabel('Execution operator', { exact: true }).fill('Authorised Operator #02');
  await execution.getByRole('checkbox', { name: 'I confirm the authorised operator role and approved plan', exact: true }).check();
  await page.clock.setFixedTime(new Date(BASE + 3 * 60000));
  await execution.getByRole('button', { name: 'Execute approved prototype plan', exact: true }).click();
  await expect(page.getByText('MONITORING', { exact: true })).toBeVisible();
  stage = 'Closure and outcome review';
  await page.clock.setFixedTime(new Date(BASE + 4 * 60000));
  await page.getByRole('button', { name: 'Close Intervention', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Close this intervention?', exact: true }).getByRole('button', { name: 'Close & measure', exact: true }).click();
  await page.clock.setFixedTime(new Date(BASE + 4 * 60000 + 6000));
  await expect(page.getByText(/MEASUREMENT WINDOW COMPLETE · Numerical outcomes require explicit evidence/)).toBeVisible({ timeout: 15000 });
  await page.getByRole('navigation', { name: 'KPI selector' }).getByRole('button', { name: /^K7\b/ }).click();
  await expect(page.locator('.kw-primary-result .kw-result-number')).toContainText('100%');
  await expect(page.locator('.kw-audit-row')).toHaveCount(1);
  await expect(page.getByText(/K7 measures logging completeness, not decision quality/).first()).toBeVisible();
  // Do not enter observations: unavailable measured environmental data stays unavailable.
  for (const id of ['K2', 'K3', 'K5', 'K6']) {
    await page.getByRole('navigation', { name: 'KPI selector' }).getByRole('button', { name: new RegExp(`^${id}\\b`) }).click();
    await expect(page.locator('.kw-primary-result')).toContainText('No data');
  }
  await navigate(page, 'Decision Log');
  await capture(page, 4, [page.locator('.page-heading h1').filter({ hasText: 'Decision Log' }), ...['Human approval recorded', 'Authorised operator execution recorded', 'Intervention closed', 'Review window completed'].map(label => page.locator('.decision-entry h3').filter({ hasText: label })), page.locator('.decision-entry').first().getByText('Mobility Department', { exact: true }), page.locator('.decision-entry').nth(1).getByText('Authorised Operator #02', { exact: true })]);

  assert.deepEqual((await readdir(output)).sort(), [...filenames].sort(), 'The presentation-assets directory must contain exactly the five requested PNGs.');
  for (const name of filenames) verifyPng(await readFile(resolve(output, name)), name);
  console.log('All five real application screenshots captured. K7 verified: 1/1 complete (100%); inconclusive outcome, not proof of success.');
} catch (error) {
  console.error(`Screenshot capture failed during ${stage}: ${error.stack || error.message}`);
  if (page) {
    try { await mkdir(resolve(root, 'work'), { recursive: true }); await page.screenshot({ path: resolve(root, 'work/screenshots-failure.png'), animations: 'disabled' }); console.error('Diagnostic screenshot: work/screenshots-failure.png (git-ignored)'); } catch {}
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server?.close();
}
