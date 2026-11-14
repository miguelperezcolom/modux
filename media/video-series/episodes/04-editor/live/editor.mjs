// The modux editor as the episode films it: the real <modux-editor-connected> web component served
// by an isolated modux server (see ../setup.sh) over a copy of the Tickets model. Everything the
// hand does is real pointer input on the component; every change goes to the server, which writes
// the model files.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const SERVER = process.env.MODUX_EDITOR ?? `http://localhost:${process.env.PORT ?? 8194}`;
const here = dirname(fileURLToPath(import.meta.url));
export const WORK = resolve(here, '../../../build/04-editor');

/** Back to the committed model (setup.sh's baseline): the shot that opens the story starts clean. */
export function reset() {
  execFileSync('bash', [resolve(here, '../reset.sh')], { stdio: 'inherit' });
}

/** The editor, injected into a page of the server, loaded off camera; the palette folded unless asked. */
export async function openEditor(film, page, { lang = 'en', palette = false, fit = true } = {}) {
  await page.goto(`${SERVER}/modux/editor/version`);
  await page.evaluate(async (lang) => {
    await import('/modux-editor/modux-editor.js');
    const el = document.createElement('modux-editor-connected');
    el.setAttribute('base', '/modux/editor');
    el.setAttribute('lang', lang);
    document.body.style.margin = '0';
    el.style.cssText = 'display:block;width:100vw;height:100vh';
    document.body.innerHTML = '';
    document.body.appendChild(el);
  }, lang);
  await film.wait(async () => (await page.locator('g[data-node-id="bc-sales"]').count()) > 0);
  if (!palette) await page.locator('button', { hasText: '☰' }).first().click();
  if (fit) await page.locator('button', { hasText: lang === 'es' ? 'Ajustar' : 'Fit' }).first().click();
  await film.idle(1.2);
}

export const node = (page, id) => page.locator(`g[data-node-id="${id}"] rect`).first();
export const nodeIds = (page) => page.locator('g[data-node-id]').evaluateAll((gs) => gs.map((g) => g.getAttribute('data-node-id')));
export const toggle = (page, id) => page.locator(`g[data-node-id="${id}"] rect[data-collapse-toggle]`).first();
export const button = (page, text) => page.locator('button', { hasText: text }).first();

export async function center(page, id) {
  const b = await node(page, id).boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Press at `from`, glide to `to`, release: a real drag, filmed. */
export async function drag(film, hand, from, to, seconds = 1.0) {
  await hand.moveTo(from, 0.5);
  await page(hand).evaluate(() => window.__cursor?.press(true));
  await page(hand).mouse.down();
  await film.play(0.15);
  await hand.moveTo(to, seconds);
  await film.play(0.2);
  await page(hand).mouse.up();
  await page(hand).evaluate(() => window.__cursor?.press(false));
  await film.frame();
}
const page = (hand) => hand.page;

/** Select a node, then the connect handle of it that points the most towards `target`. */
export async function handleTowards(film, hand, id, target) {
  await hand.click(node(hand.page, id), { move: 0.6 });
  await film.play(0.3);
  const hs = await hand.page.locator('circle[data-handle]').evaluateAll((cs) =>
    cs.map((c) => { const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  if (!hs.length) throw new Error(`no connect handle on ${id}`);
  const d = (h) => Math.hypot(h.x - target.x, h.y - target.y);
  return hs.reduce((a, b) => (d(b) < d(a) ? b : a));
}

/** The model repo's git, as the terminal would print it. */
export function git(...args) {
  return execFileSync('git', ['-C', resolve(WORK, 'model'), ...args], { encoding: 'utf8' });
}
