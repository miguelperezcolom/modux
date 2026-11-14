// The frame engine: a Playwright page whose time only moves when we say so.
//
// - JS time: Playwright's clock, installed and paused (clock.install + clock.pauseAt); every frame
//   advances it by exactly 1/FPS (clock.runFor), so timers, debounces and requestAnimationFrame
//   run as they would, one frame at a time.
// - CSS time: CDP Animation.setPlaybackRate(0) stops the document timeline; every frame moves each
//   running animation's currentTime forward by 1/FPS. A transition that starts mid-scene starts at 0
//   and is advanced from then on, so it plays at its real speed in the video.
// - One screenshot per frame (deviceScaleFactor 1 at 1920x1080 or 2 at 960x540 — see `open`),
//   piped as PNG to ffmpeg, encoded H.264 at 30 fps.
// Network answers arrive in real time while the clock is paused; a step that waits for the server
// (`settle`) keeps capturing frames, so a spinner shows as long as it would.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const FPS = 30;
export const W = 1920, H = 1080;
const START = new Date('2026-11-14T10:00:00Z');

let browser;
export async function launch() {
  browser ??= await chromium.launch();
  return browser;
}
export async function close() {
  if (browser) await browser.close();
  browser = undefined;
}

/**
 * A page ready to be filmed. `scale` > 1 renders a smaller CSS viewport at higher density (a
 * real app looks like it does on a laptop screen, not stretched over 1920 CSS pixels).
 */
export async function open({ scale = 1, init } = {}) {
  const b = await launch();
  const context = await b.newContext({
    viewport: { width: Math.round(W / scale), height: Math.round(H / scale) },
    deviceScaleFactor: scale,
    locale: 'en-US',
    timezoneId: 'Europe/Madrid',
    colorScheme: 'light',
  });
  if (init) await context.addInitScript(init.fn, init.arg);
  const page = await context.newPage();
  await page.clock.install({ time: START });
  await page.clock.pauseAt(START);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  // keep the timeline stopped across navigations
  page.on('framenavigated', async (f) => {
    if (f === page.mainFrame()) await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 }).catch(() => {});
  });
  return { page, context, cdp };
}

/** A film: frames of one page into one mp4 at exactly FPS. */
export class Film {
  constructor(page, out) {
    this.page = page;
    this.out = out;
    this.frames = 0;
    mkdirSync(dirname(out), { recursive: true });
    this.ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-vf', `scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '14',
      '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    this.done = new Promise((r) => this.ff.on('close', r));
    this.last = null;
  }

  get seconds() { return this.frames / FPS; }

  async #advance() {
    const dt = 1000 / FPS;
    await this.page.clock.runFor(dt);
    await this.page.evaluate((d) => {
      // document.getAnimations() leaves out shadow trees, where web components (Vaadin, Mateu) animate:
      // collect every root, so an overlay's closing animation ends and fires its animationend
      const roots = [document];
      const walk = (root) => {
        for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { roots.push(el.shadowRoot); walk(el.shadowRoot); }
      };
      walk(document);
      const seen = new Set();
      for (const r of roots) for (const a of r.getAnimations()) {
        if (seen.has(a)) continue;
        seen.add(a);
        if (a.playState === 'finished' && !(a.effect?.getTiming?.().iterations === Infinity)) continue;
        a.currentTime = (a.currentTime ?? 0) + d;
      }
    }, dt).catch(() => {});
  }

  async #write(png) {
    this.last = png;
    this.frames++;
    if (!this.ff.stdin.write(png)) await new Promise((r) => this.ff.stdin.once('drain', r));
  }

  /** One frame: time moves 1/FPS, then the page is captured. */
  async frame() {
    await this.#advance();
    const png = await this.page.screenshot({ type: 'png', animations: 'allow', caret: 'initial' });
    await this.#write(png);
  }

  /** Film for `seconds` of video time. */
  async play(seconds) {
    const n = Math.round(seconds * FPS);
    for (let i = 0; i < n; i++) await this.frame();
  }

  /** Keep filming until `until()` is true (the server answered, a screen rendered); then `after` more. */
  async settle(until, { timeout = 30, after = 0.4 } = {}) {
    const t0 = Date.now();
    for (;;) {
      await this.frame();
      let ok = false;
      try { ok = await until(); } catch { ok = false; }
      if (ok) break;
      if (Date.now() - t0 > timeout * 1000) throw new Error(`settle: timed out after ${timeout}s at ${this.seconds.toFixed(1)}s`);
    }
    await this.play(after);
  }

  /** Let `seconds` of page time pass without filming (setting up before the shot). */
  async idle(seconds) {
    const n = Math.round(seconds * FPS);
    for (let i = 0; i < n; i++) await this.#advance();
  }

  /** Off camera until `until()`: page time moves, nothing is captured. */
  async wait(until, { timeout = 30 } = {}) {
    const t0 = Date.now();
    for (;;) {
      await this.#advance();
      let ok = false;
      try { ok = await until(); } catch { ok = false; }
      if (ok) return;
      if (Date.now() - t0 > timeout * 1000) throw new Error(`wait: timed out after ${timeout}s`);
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  /** Hold the last frame (no capture) until the film lasts `seconds`. */
  async padTo(seconds) {
    const n = Math.round(seconds * FPS) - this.frames;
    for (let i = 0; i < n; i++) await this.#write(this.last);
  }

  async end() {
    this.ff.stdin.end();
    await this.done;
    return this.seconds;
  }
}
