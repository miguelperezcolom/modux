// Filming the running system: a visible cursor and human-paced gestures, frame by frame.
// The gestures are real Playwright input (mouse, keyboard) on the real app; the cursor is a drawn
// overlay that follows them, because a headless browser has no pointer of its own to show.
import { FPS } from './frames.mjs';

const CURSOR = `
(() => {
  if (window.__cursor) return;
  const install = () => {
    if (document.getElementById('__cursor')) return;
    const c = document.createElement('div');
    c.id = '__cursor';
    c.innerHTML = '<svg width="26" height="30" viewBox="0 0 26 30"><path d="M3 2 L3 24 L9 18.5 L13 27 L17 25 L13 16.8 L21 16.8 Z" fill="#111" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg><span></span>';
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 2147483647, pointerEvents: 'none',
      transform: 'translate(-100px,-100px)', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))' });
    const ring = c.querySelector('span');
    Object.assign(ring.style, { position: 'absolute', left: '-14px', top: '-14px', width: '30px', height: '30px',
      borderRadius: '50%', border: '3px solid rgba(124,92,255,.85)', opacity: '0', transform: 'scale(.4)' });
    document.documentElement.appendChild(c);
  };
  window.__cursor = {
    move(x, y) { install(); document.getElementById('__cursor').style.transform = 'translate(' + x + 'px,' + y + 'px)'; },
    press(p) { install(); const r = document.querySelector('#__cursor span'); r.style.opacity = p ? '1' : '0'; r.style.transform = p ? 'scale(1)' : 'scale(.4)'; },
  };
  new MutationObserver(() => install()).observe(document, { childList: true, subtree: true });
})();`;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Hand {
  constructor(film) {
    this.film = film;
    this.page = film.page;
    this.x = 1500; this.y = 820;
  }

  async #cursor(x, y) {
    await this.page.evaluate(([src, x, y]) => { if (!window.__cursor) (0, eval)(src); window.__cursor.move(x, y); }, [CURSOR, x, y]);
  }

  async #center(target) {
    const loc = typeof target === 'string' ? this.page.locator(target).first() : target;
    await loc.waitFor({ state: 'visible', timeout: 30000 });
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    if (!b) throw new Error(`no box for ${target}`);
    return { x: b.x + Math.min(b.width / 2, 60), y: b.y + b.height / 2, loc };
  }

  /** Glide to an element (or to x,y) over `seconds`, filming. */
  async moveTo(target, seconds = 0.6) {
    const to = typeof target === 'object' && 'x' in target && !('locator' in target) && typeof target.x === 'number'
      ? target : await this.#center(target);
    const n = Math.max(1, Math.round(seconds * FPS));
    const x0 = this.x, y0 = this.y;
    for (let i = 1; i <= n; i++) {
      const k = ease(i / n);
      this.x = x0 + (to.x - x0) * k; this.y = y0 + (to.y - y0) * k;
      await this.page.mouse.move(this.x, this.y);
      await this.#cursor(this.x, this.y);
      await this.film.frame();
    }
    return to;
  }

  /** Move there, press, release: the click is the real one. */
  async click(target, { move = 0.6, hold = 0.15 } = {}) {
    await this.moveTo(target, move);
    await this.page.evaluate(() => window.__cursor?.press(true));
    await this.page.mouse.down();
    await this.film.play(hold);
    await this.page.mouse.up();
    await this.page.evaluate(() => window.__cursor?.press(false));
    await this.film.frame();
  }

  /** Type into the focused element, one key every `perKey` seconds. */
  async type(text, perKey = 0.035) {
    const every = Math.max(1, Math.round(perKey * FPS));
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      for (let i = 0; i < every; i++) await this.film.frame();
    }
  }

  async press(key, after = 0.2) {
    await this.page.keyboard.press(key);
    await this.film.play(after);
  }

  /** Click a field and type into it. */
  async fill(target, text, opts) {
    await this.click(target, opts);
    await this.type(text);
  }

  /** Scroll the page smoothly by `dy` CSS pixels. */
  async scroll(dy, seconds = 0.8) {
    const n = Math.max(1, Math.round(seconds * FPS));
    let done = 0;
    for (let i = 1; i <= n; i++) {
      const want = Math.round(dy * ease(i / n));
      await this.page.mouse.wheel(0, want - done);
      done = want;
      await this.film.frame();
    }
  }

  async hide() { await this.page.evaluate(() => window.__cursor?.move(-100, -100)); this.x = -100; }
}
