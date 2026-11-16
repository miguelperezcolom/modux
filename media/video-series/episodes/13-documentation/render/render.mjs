// Renders a Markdown file the way a Markdown viewer with Mermaid support shows it (GitHub, GitLab,
// IntelliJ's preview all draw ```mermaid blocks): marked for the Markdown, mermaid for the diagrams,
// in a real browser. The result is a static page (inline SVG, no scripts) the live shots film.
//
//   node render.mjs <in.md> <out.html> [title]
//
// Nothing of the document is written here: every word and every diagram comes from <in.md>.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const [input, output, title = 'HLA.generated.md'] = process.argv.slice(2);
const md = readFileSync(resolve(input), 'utf8');

const renderer = new marked.Renderer();
const code = renderer.code.bind(renderer);
renderer.code = (token) => token.lang === 'mermaid'
  ? `<pre class="mermaid">${token.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
  : code(token);
const body = marked.parse(md, { renderer, gfm: true });

const css = `
  :root { color-scheme: light; }
  html { background: #eef0f4; }
  body { margin: 0; font: 16px/1.55 -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1f2328; }
  .bar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 24px;
         background: #fff; border-bottom: 1px solid #d0d7de; font-size: 14px; color: #57606a; }
  .bar b { color: #1f2328; font-weight: 600; }
  main { max-width: 1000px; margin: 22px auto 60vh; padding: 28px 44px 40px; background: #fff; border: 1px solid #d0d7de; border-radius: 8px; }
  h1 { font-size: 30px; margin: 0 0 14px; padding-bottom: 8px; border-bottom: 1px solid #d8dee4; }
  h2 { font-size: 23px; margin: 30px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #d8dee4; }
  h3 { font-size: 19px; margin: 24px 0 10px; }
  p, ul, ol, table, blockquote { margin: 0 0 14px; }
  blockquote { padding: 0 14px; color: #57606a; border-left: 4px solid #d0d7de; }
  table { border-collapse: collapse; width: 100%; font-size: 15px; }
  th, td { border: 1px solid #d0d7de; padding: 6px 12px; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; }
  code { font: 13.5px ui-monospace, Menlo, monospace; background: #eff1f3; padding: 1px 5px; border-radius: 5px; }
  pre.mermaid { display: flex; justify-content: center; background: #fff; margin: 0 0 16px; padding: 8px 0; }
  pre.mermaid svg { max-width: 100%; height: auto; }
`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head>
<body><div class="bar"><b>${title}</b><span>· Markdown preview, Mermaid diagrams drawn</span></div><main>${body}</main></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.setContent(html);
await page.addScriptTag({ path: resolve(here, 'node_modules/mermaid/dist/mermaid.min.js') });
await page.evaluate(async () => {
  window.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose',
    flowchart: { htmlLabels: true }, fontFamily: '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif' });
  await window.mermaid.run({ querySelector: 'pre.mermaid' });
  document.querySelectorAll('script').forEach((s) => s.remove());
});
writeFileSync(resolve(output), '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML)));
await browser.close();
console.log('rendered', output);
