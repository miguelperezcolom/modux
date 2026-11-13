// Renders the promo video frame by frame: scenes/index.html exposes render(t); for every frame
// this sets t, screenshots the page at 1920x1080 and pipes the PNG to ffmpeg. Deterministic —
// nothing on the page moves on its own — so the same inputs always give the same video.
//
//   node scripts/render-animated.mjs                       # whole video → build/master.mp4
//   node scripts/render-animated.mjs --from 38 --to 55     # a range (for iterating on a scene)
//   node scripts/render-animated.mjs --stills 3,12,21      # single frames → build/stills/*.png
//   --strings strings.es.json                              # another language
//   --page scenes/opening.html --out build/opening.mp4     # the opening
//
// Inputs: strings.json, the model and the code in app/, build/out/* (capture-terminal.sh and the
// ai-complete log), build/real/* (capture-real.mjs, capture-editor.mjs), doc/public/favicon.svg.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : dflt; };
const FPS = Number(arg('fps', 30));
const from = Number(arg('from', 0));
const stills = arg('stills', null);
const out = resolve(here, arg('out', 'build/master.mp4'));
const scenePage = arg('page', 'scenes/index.html');

const read = (p) => readFileSync(resolve(here, p), 'utf8');
const lines = (p) => read(p).split('\n').filter((l) => l.trim().length > 0);
const need = ['build/out/generate.txt', 'build/out/deploy.txt', 'build/out/aicomplete.txt', 'build/out/counts.json',
  'build/out/change-model.diff', 'build/real/boxes.json', 'build/real/editor.json'];
if (scenePage.endsWith('index.html')) for (const n of need) {
  if (!existsSync(resolve(here, n))) throw new Error(`missing ${n}: run the captures first (see README)`);
}

/** A folded YAML scalar (Jackson's `\` continuations) shown on one line: the same value, as a person writes it. */
function unfold(yaml) {
  const outLines = [];
  for (const l of yaml.split('\n')) {
    const cont = l.match(/^\s*\\ ?(.*)$/);
    if (cont && outLines.length && outLines[outLines.length - 1].endsWith('\\')) {
      outLines[outLines.length - 1] = outLines[outLines.length - 1].slice(0, -1) + (cont[1].startsWith(' ') ? cont[1] : ' ' + cont[1]);
    } else if (outLines.length && outLines[outLines.length - 1].endsWith('\\')) {
      outLines[outLines.length - 1] = outLines[outLines.length - 1].slice(0, -1) + ' ' + l.trim();
    } else outLines.push(l);
  }
  return outLines.join('\n');
}
/** Java as it reads on screen: the package line and the imports folded away. */
function javaBody(src) {
  return src.split('\n').filter((l) => !/^(package|import) /.test(l)).join('\n').replace(/^\s*\n+/, '').trimEnd();
}

const svg = read('../../doc/public/favicon.svg');
const logo = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<style>[\s\S]*?<\/style>/g, '');
const optional = (p, f) => (existsSync(resolve(here, p)) ? f(p) : null);

const DATA = {
  strings: JSON.parse(read(arg('strings', 'strings.json'))),
  logo,
  counts: optional('build/out/counts.json', (p) => JSON.parse(read(p))),
  out: {
    generate: optional('build/out/generate.txt', lines),
    aicomplete: optional('build/out/aicomplete.txt', lines),
    deploy: optional('build/out/deploy.txt', lines),
    changeGenerate: optional('build/out/change-generate.txt', lines),
    changeStat: optional('build/out/change-stat.txt', (p) => read(p).trim()),
    changeServices: optional('build/out/change-services.txt', lines),
    changeModel: optional('build/out/change-model.diff', read),
    changeMigration: optional('build/out/change-migration.sql', read),
  },
  yaml: unfold(read('app/modux/aggregates/purchase.yaml')).split('\n').filter((l) => l !== '---').join('\n'),
  steps: javaBody(read('app/system/payments/payments/src/main/java/io/tickets/payments/application/usecases/charge/ChargeSteps.java')),
  hook: javaBody(read('app/system/payments/payments-custom/src/main/java/io/tickets/custom/DefaultChargeSteps.java')),
  boxes: optional('build/real/boxes.json', (p) => JSON.parse(read(p))),
  editor: optional('build/real/editor.json', (p) => JSON.parse(read(p))),
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.addInitScript((d) => { window.DATA = d; }, DATA);
await page.goto('file://' + resolve(here, scenePage));
await page.evaluate(() => window.ready);
await page.evaluate(() => window.render(0));
await page.waitForTimeout(500);

const to = Number(arg('to', await page.evaluate(() => window.DURATION)));
async function frameAt(t) {
  await page.evaluate((tt) => window.render(tt), t);
  await page.evaluate(() => window.pending);
  return page.screenshot({ type: 'png', animations: 'disabled' });
}

if (stills) {
  mkdirSync(resolve(here, 'build/stills'), { recursive: true });
  for (const s of stills.split(',').map(Number)) {
    const p = resolve(here, `build/stills/t${String(s.toFixed(1)).padStart(5, '0')}.png`);
    writeFileSync(p, await frameAt(s));
    console.log('still', p);
  }
  await browser.close();
  process.exit(0);
}

mkdirSync(dirname(out), { recursive: true });
// Master: H.264 in yuv444p at a very low CRF — near-lossless, so the final encodes start clean.
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '8', '-pix_fmt', 'yuv444p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
const first = Math.round(from * FPS), last = Math.round(to * FPS);
const started = Date.now();
for (let f = first; f < last; f++) {
  const png = await frameAt(f / FPS);
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if ((f - first) % (FPS * 5) === 0) console.log(`t=${(f / FPS).toFixed(1)}s  ${(((f - first) / (last - first)) * 100).toFixed(0)}%  ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('master', out, `${((Date.now() - started) / 1000).toFixed(0)}s`);
