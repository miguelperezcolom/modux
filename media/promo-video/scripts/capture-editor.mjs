// The model in the modux editor: the system map of app/modux, captured at 2x with the palette and the
// inferred elements hidden, plus the boxes of the nodes the camera frames (build/real/editor.json).
// Needs a modux server over app/modux (see README: an isolated home on :8193).
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.MODUX_URL ?? 'http://localhost:8193';
mkdirSync(resolve(here, 'build/real'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
await page.goto(`${BASE}/modux/editor/version`);
await page.evaluate(async () => {
  await import('/modux-editor/modux-editor.js');
  const el = document.createElement('modux-editor-connected');
  el.setAttribute('base', '/modux/editor');
  document.body.style.margin = '0';
  el.style.cssText = 'display:block;width:100vw;height:100vh';
  document.body.innerHTML = '';
  document.body.appendChild(el);
});
await page.waitForTimeout(2500);
await page.mouse.click(960, 540);
await page.keyboard.press('p');                                  // hide the palette
await page.getByText('Inferidos', { exact: false }).first().click();
await page.getByText('Ajustar', { exact: false }).first().click(); // fit
await page.waitForTimeout(1500);
await page.mouse.move(1919, 1079);
await page.waitForTimeout(7000);                             // the editor's notices fade out
const nodes = {};
for (const name of ['PROMOTER', 'CUSTOMER', 'Listings', 'ConcertAPI', 'PurchaseAPI', 'PaymentAPI', 'Catalog', 'Sales', 'Payments', 'Analytics', 'Paygate', 'Legacy']) {
  const b = await page.getByText(name, { exact: true }).first().boundingBox();
  if (b) nodes[name] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
}
await page.screenshot({ path: resolve(here, 'build/real/editor-map.png') });
writeFileSync(resolve(here, 'build/real/editor.json'), JSON.stringify({ viewport: { w: 1920, h: 1080 }, nodes }, null, 2));
console.log(JSON.stringify(nodes));
await browser.close();
