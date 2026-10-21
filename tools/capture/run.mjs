// Usage: start `npx vite --port 5199`, then `node tools/capture/run.mjs`.
// Writes raw transparent PNGs to .work/sprites/. tools/capture/pack.py crops and converts them.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const url = process.env.CAPTURE_URL ?? 'http://127.0.0.1:5199/tools/capture/index.html';
mkdirSync('.work/sprites', { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.error(m.text()); });
page.on('pageerror', (e) => console.error(e));
await page.goto(url);
await page.waitForFunction(() => typeof window.__shot === 'function', null, { timeout: 60000 });
const names = process.env.PARTS ? process.env.PARTS.split(',') : await page.evaluate(() => window.__names);
for (const name of names) {
  const data = await page.evaluate((n) => window.__shot(n), name);
  writeFileSync(`.work/sprites/${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
  console.log('captured', name);
}
await browser.close();
