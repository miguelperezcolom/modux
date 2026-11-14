// Renders one episode end to end.
//
//   node lib/episode.mjs episodes/01-in-3-minutes            # voice, render every scene, assemble
//   node lib/episode.mjs episodes/01-in-3-minutes --only s3   # re-render one scene, assemble again
//   node lib/episode.mjs episodes/01-in-3-minutes --assemble  # only assemble (scenes already rendered)
//   node lib/episode.mjs episodes/01-in-3-minutes --still s3@2.5   # one PNG of scene s3 at 2.5 s
//
// episode.json: { number, title{en,es}, scenes: [ { id, kind, narration{en,es}, min?, ...kind data } ] }
//   kind "live": { script: "live/foo.mjs" } — a module exporting `async (ctx) => {}` that films the
//   running system with lib/live.mjs; its scene lasts as long as it films, at least its narration.
//   any other kind is a scenes/scene.html kind; the scene's fields are its data.
// A scene lasts LEAD + the longer of its two narrations + TAIL (or `min`, whichever is longer):
// both languages share one picture, each with its own voice track.
// Output, under build/<episode>/:
//   modux-<nn>-<slug>-en.mp4 / -es.mp4   1920x1080, 30 fps, H.264, voice only
//   modux-<nn>-<slug>-en.srt / -es.srt   subtitles (each track times its own language's voice)
//   thumbnail.jpg
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { open, Film, close, FPS } from './frames.mjs';
import { Hand } from './live.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? (process.argv[i + 1] ?? true) : undefined; };
const epDir = resolve(here, process.argv[2]);
const name = basename(epDir);
const ep = JSON.parse(readFileSync(join(epDir, 'episode.json'), 'utf8'));
const build = resolve(here, 'build', name);
mkdirSync(join(build, 'scenes'), { recursive: true });
const LEAD = 0.5, TAIL = 0.9;
const LANGS = ['en', 'es'];

const logo = readFileSync(resolve(here, '../../doc/public/favicon.svg'), 'utf8')
  .replace(/^[\s\S]*?(<svg)/, '$1').replace(/<style>[\s\S]*?<\/style>/g, '');

function narrate() {
  execFileSync(resolve(here, '.venv/bin/python'), [resolve(here, 'lib/narrate.py'), epDir], { stdio: 'inherit' });
}
const timings = () => Object.fromEntries(LANGS.map((l) => [l, JSON.parse(readFileSync(join(build, 'audio', l, 'timings.json'), 'utf8'))]));

function wanted(scene, t) {
  const voice = Math.max(0, ...LANGS.map((l) => t[l][scene.id]?.duration ?? 0));
  return Math.max(scene.min ?? 0, voice ? LEAD + voice + TAIL : 0, 1);
}

/** Resolves `@file:` values in a scene (real files, never pasted copies). */
function value(v) {
  if (typeof v !== 'string') return v;
  if (v.startsWith('@file:')) return readFileSync(resolve(epDir, v.slice(6)), 'utf8');
  if (v.startsWith('@lines:')) return readFileSync(resolve(epDir, v.slice(7)), 'utf8').split('\n').filter((l) => l.trim());
  if (v.startsWith('@json:')) {           // @json:real/counts.json:modelLines — a measured number, formatted
    const [file, key] = v.slice(6).split(':');
    const n = JSON.parse(readFileSync(resolve(epDir, file), 'utf8'))[key];
    return typeof n === 'number' ? n.toLocaleString('en-US') : n;
  }
  return v.replace(/\{@json:([^}]+)\}/g, (_, ref) => value('@json:' + ref));
}
function data(scene) {
  if (Array.isArray(scene)) return scene.flatMap((v) => { const r = typeof v === 'object' ? data(v) : value(v); return Array.isArray(r) && typeof v === 'string' && v.startsWith('@lines:') ? r : [r]; });
  const out = {};
  for (const [k, v] of Object.entries(scene)) {
    if (k === 'narration') out[k] = v;
    else if (v && typeof v === 'object') out[k] = data(v);
    else out[k] = value(v);
  }
  return out;
}

async function renderScene(scene, seconds, still) {
  const out = join(build, 'scenes', `${scene.id}.mp4`);
  if (scene.kind === 'live') {
    const mod = await import(pathToFileURL(resolve(epDir, scene.script)).href);
    const shot = await open({ scale: scene.scale ?? 1.5 });
    const film = new Film(shot.page, out);
    const hand = new Hand(film);
    await mod.default({ film, hand, page: shot.page, context: shot.context, scene: data(scene), seconds, epDir });
    await film.padTo(Math.max(seconds, film.seconds));
    const s = await film.end();
    await shot.context.close();
    return s;
  }
  const shot = await open({ init: { fn: (d) => { window.SCENE = d; }, arg: { ...data(scene), logo, series: ep.series ?? 'modux in N minutes', number: ep.number } } });
  await shot.page.goto(pathToFileURL(resolve(here, 'scenes/scene.html')).href);
  await shot.page.evaluate(() => window.ready);
  if (still !== undefined) {
    const film = new Film(shot.page, join(build, 'stills', '_discard.mp4'));
    await film.play(still);
    writeFileSync(join(build, 'stills', `${scene.id}@${still}.png`), film.last);
    await film.end();
    await shot.context.close();
    return;
  }
  const film = new Film(shot.page, out);
  await film.play(seconds);
  const s = await film.end();
  await shot.context.close();
  return s;
}

const probe = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
const srtTime = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };

function assemble(t) {
  const slug = `modux-${String(ep.number).padStart(2, '0')}-${ep.slug}`;
  const list = join(build, 'scenes.txt');
  const starts = {}; let at = 0;
  for (const s of ep.scenes) { starts[s.id] = at; at += probe(join(build, 'scenes', `${s.id}.mp4`)); }
  const total = at;
  writeFileSync(list, ep.scenes.map((s) => `file '${join(build, 'scenes', `${s.id}.mp4`)}'`).join('\n'));
  const video = join(build, 'video.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  for (const lang of LANGS) {
    // the voice track: each scene's narration placed LEAD after the scene starts
    const inputs = [], filters = [];
    ep.scenes.forEach((s) => {
      const wav = join(build, 'audio', lang, `${s.id}.wav`);
      if (!t[lang][s.id] || !existsSync(wav)) return;
      inputs.push('-i', wav);
      const i = inputs.length / 2;
      filters.push(`[${i}:a]adelay=${Math.round((starts[s.id] + LEAD) * 1000)}:all=1[a${i}]`);
    });
    const n = inputs.length / 2;
    const mix = `${filters.join(';')};${Array.from({ length: n }, (_, k) => `[a${k + 1}]`).join('')}amix=inputs=${n}:normalize=0,apad,atrim=0:${total.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11[voice]`;
    const out = join(build, `${slug}-${lang}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, ...inputs, '-filter_complex', mix, '-map', '0:v', '-map', '[voice]',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out]);
    // subtitles: one cue per sentence, as voiced
    let k = 0; const cues = [];
    for (const s of ep.scenes) for (const c of t[lang][s.id]?.sentences ?? []) {
      const a = starts[s.id] + LEAD + c.start, b = starts[s.id] + LEAD + c.end;
      cues.push(`${++k}\n${srtTime(a)} --> ${srtTime(b)}\n${c.text.replace(/`/g, '')}\n`);
    }
    writeFileSync(join(build, `${slug}-${lang}.srt`), cues.join('\n'));
    console.log(lang, out, `${total.toFixed(1)}s`, `${k} cues`);
  }
  if (ep.thumbnail) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(starts[ep.thumbnail.scene] + (ep.thumbnail.at ?? 2)), '-i', video, '-frames:v', '1', '-vf', 'scale=1280:720', '-q:v', '2', join(build, 'thumbnail.jpg')]);
}

const only = arg('only'), still = arg('still');
if (!arg('assemble') && !still) narrate();
const t = timings();
if (still) {
  const [id, sec] = String(still).split('@');
  mkdirSync(join(build, 'stills'), { recursive: true });
  await renderScene(ep.scenes.find((s) => s.id === id), wanted(ep.scenes.find((s) => s.id === id), t), Number(sec));
  await close();
  process.exit(0);
}
if (!arg('assemble')) {
  for (const scene of ep.scenes) {
    if (only && !String(only).split(',').includes(scene.id)) continue;
    const want = wanted(scene, t);
    const t0 = Date.now();
    const got = await renderScene(scene, want);
    console.log(`scene ${scene.id.padEnd(14)} ${scene.kind.padEnd(10)} ${got.toFixed(2)}s (narration wants ${want.toFixed(2)}s)  ${((Date.now() - t0) / 1000).toFixed(0)}s to render`);
  }
}
await close();
const missing = ep.scenes.filter((s) => !existsSync(join(build, 'scenes', `${s.id}.mp4`))).map((s) => s.id);
if (missing.length) console.log('not assembled yet — scenes to render:', missing.join(', '));
else assemble(t);
