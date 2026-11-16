// The generated document, rendered (real/hla.html, written by capture.sh from HLA.generated.md):
// a static page, so the shots only scroll it and point at what the narration names.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const TOP = 52;   // under the page's sticky bar
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function open(page, epDir) {
  await page.goto(pathToFileURL(resolve(epDir, 'real/hla.html')).href);
}

// Headings are numbered since 0.6.8 («4.3 Payments»): match the text with or without its number.
export const heading = (page, text) => page.getByRole('heading', { name: new RegExp('^(\\d+(\\.\\d+)*\\.?\\s+)?' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') });

async function targetY(page, locator, offset) {
  const b = await locator.boundingBox();
  const y = await page.evaluate(() => window.scrollY);
  return Math.max(0, y + b.y - offset);
}

/** Off camera: the page starts with `locator` at the top. */
export async function jump(page, locator, offset = TOP) {
  const y = await targetY(page, locator, offset);
  await page.evaluate((y) => window.scrollTo(0, y), y);
}

/** On camera: a smooth scroll that brings `locator` to the top (or `offset` px under it). */
export async function glide(film, page, locator, seconds = 1.2, offset = TOP) {
  const y1 = await targetY(page, locator, offset);
  const y0 = await page.evaluate(() => window.scrollY);
  const n = Math.max(1, Math.round(seconds * 30));
  for (let i = 1; i <= n; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y0 + (y1 - y0) * ease(i / n));
    await film.frame();
  }
}

/** The on-screen middle of `text` inside the first element matching `selector` (for the cursor). */
export async function textAt(page, selector, text) {
  return page.evaluate(([selector, text]) => {
    const root = [...document.querySelectorAll(selector)].find((e) => e.textContent.includes(text));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) {
      const i = n.data.indexOf(text);
      if (i < 0) continue;
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + text.length);
      const b = r.getBoundingClientRect();
      return { x: b.x + Math.min(b.width / 2, 80), y: b.y + b.height / 2 };
    }
    throw new Error(`no "${text}" in ${selector}`);
  }, [selector, text]);
}

/** A node of a Mermaid diagram, by its label. */
export const node = (page, label) => page.locator('svg').getByText(label, { exact: true }).first();
