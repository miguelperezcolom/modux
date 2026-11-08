/**
 * Dev harness for the PLUGIN host (`<modux-archi-ide>`), outside IntelliJ.
 *
 * It stands in for the JCEF `moduxBridge` with a localStorage-backed catalog (`.modux/` tree) and
 * view document, so the exact host code the plugin runs — loadTree → project → applyAll → flush →
 * readView/writeView — can be exercised (and survive a reload) in a plain browser. This is a test
 * rig, not shipped: the plugin injects the real bridge over JCEF.
 */
import { stringify } from 'yaml';
import '../host/modux-archi-ide.js';

const CK = 'archi-harness-catalog';   // path → yaml content (the .modux/ tree)
const VK = 'archi-harness-view';      // the view document text

type Catalog = Record<string, string>;
const loadCat = (): Catalog => { try { return JSON.parse(localStorage.getItem(CK) ?? '{}'); } catch { return {}; } };
const saveCat = (c: Catalog) => localStorage.setItem(CK, JSON.stringify(c));

let view = localStorage.getItem(VK)
  ?? stringify({ viewId: 'sistema', name: 'Sistema', memberIds: [], geometry: { nodes: {}, edges: {} } });

(globalThis as unknown as { moduxBridge: (r: Record<string, unknown>) => Promise<unknown> }).moduxBridge =
  async (req) => {
    const op = req.op as string;
    const path = (req.path as string) ?? '';
    const c = loadCat();
    switch (op) {
      case 'listDirs': {
        const pre = path ? `${path}/` : '';
        const dirs = new Set<string>();
        for (const p of Object.keys(c)) if (p.startsWith(pre)) {
          const rel = p.slice(pre.length); const i = rel.indexOf('/');
          if (i > 0) dirs.add(rel.slice(0, i));
        }
        return [...dirs];
      }
      case 'list': {
        const pre = path ? `${path}/` : '';
        const names: string[] = [];
        for (const p of Object.keys(c)) if (p.startsWith(pre)) {
          const rel = p.slice(pre.length); if (!rel.includes('/')) names.push(rel);
        }
        return names;
      }
      case 'read': return c[path] ?? '';
      case 'exists': return path in c;
      case 'flush': {
        for (const w of req.writes as { path: string; content: string }[]) c[w.path] = w.content;
        for (const d of req.deletes as string[]) delete c[d];
        saveCat(c);
        return (req.writes as unknown[]).length + (req.deletes as unknown[]).length;
      }
      case 'readView': return view;
      case 'writeView': view = req.content as string; localStorage.setItem(VK, view); return true;
      case 'setModified': return null;
      case 'setTextFocus': return null; // the IDE uses it to route copy/paste keys; nothing to do here
      default: throw new Error(`unknown op: ${op}`);
    }
  };

const el = document.createElement('modux-archi-ide');
document.body.appendChild(el);

// A small reset so a harness session can start clean.
const reset = document.createElement('button');
reset.textContent = 'Reset';
reset.style.cssText = 'position:fixed;top:6px;right:8px;z-index:999;font:11px ui-sans-serif;border:1px solid #334155;background:#1e293b;color:#cbd5e1;border-radius:5px;padding:2px 8px;cursor:pointer';
reset.onclick = () => { localStorage.removeItem(CK); localStorage.removeItem(VK); location.reload(); };
document.body.appendChild(reset);
