/**
 * SPIKE: the Archi UX bound to a REAL modux model, with a FREE-FORM view.
 *
 * No specialized views: the model (elements + relations) is the source of truth, and
 * a view just says WHICH elements it shows and where. The user decides what to include.
 * Adding an element creates it in the model AND drops it on the view; deleting from the
 * view keeps it in the model (like Archi). Properties and relations edit the model.
 * Persisted to localStorage (stand-in for the plugin's JCEF bridge + .modux/ files).
 */
import './archi-shell.js';
import type { ArchiShell } from './archi-shell.js';
import type { ModuxModel } from '../model.js';
import type { ModuxCommand } from '../commands.js';
import { demoModel } from '../demo/demo-model.js';
import { onLanguageChange, t } from '../i18n/index.js';

type View = { members: { id: string; x: number; y: number; w: number; h: number }[] };
const MK = 'archi-bound-model', VK = 'archi-bound-view';

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

let model: ModuxModel = load<ModuxModel | null>(MK, null) ?? structuredClone(demoModel);

/** Seed a starter view (contexts in a row, aggregates below) the first time. */
function seedView(): View {
  const members: View['members'] = [];
  model.boundedContexts.forEach((bc, i) => members.push({ id: bc.id, x: 120 + i * 300, y: 90, w: 240, h: 130 }));
  (model.aggregates ?? []).forEach((a, i) => members.push({ id: a.id, x: 120 + i * 210, y: 320, w: 160, h: 66 }));
  return { members };
}
let view: View = load<View | null>(VK, null) ?? seedView();

function apply(cmd: ModuxCommand): void {
  switch (cmd.kind) {
    case 'rename-element': {
      const list =
        cmd.type === 'boundedContext' ? model.boundedContexts
        : cmd.type === 'aggregate' ? model.aggregates ?? []
        : cmd.type === 'entity' ? model.entities ?? []
        : model.valueObjects ?? [];
      const el = (list as { id: string; name: string }[]).find((x) => x.id === cmd.id);
      if (el) el.name = cmd.name;
      break;
    }
    case 'add-boundedContext':
      model.boundedContexts.push({ id: cmd.id, name: cmd.name, subdomainType: cmd.subdomainType });
      break;
    case 'add-aggregate':
      (model.aggregates ??= []).push({ id: cmd.id, name: cmd.name, boundedContextId: cmd.boundedContextId ?? '' });
      break;
    case 'add-entity':
      (model.entities ??= []).push({ id: cmd.id, name: cmd.name, aggregateId: cmd.aggregateId ?? '' });
      break;
    case 'add-value-object':
      (model.valueObjects ??= []).push({ id: cmd.id, name: cmd.name, aggregateId: cmd.aggregateId ?? '' });
      break;
    case 'remove-aggregate':
      model.aggregates = (model.aggregates ?? []).filter((a) => a.id !== cmd.id);
      break;
    case 'set-aggregate-context': {
      const a = (model.aggregates ?? []).find((x) => x.id === cmd.id);
      if (a) a.boundedContextId = cmd.boundedContextId ?? '';
      break;
    }
    case 'set-entity-aggregate': {
      const en = (model.entities ?? []).find((x) => x.id === cmd.id);
      if (en) en.aggregateId = cmd.aggregateId;
      break;
    }
    case 'set-value-object-aggregate': {
      const v = (model.valueObjects ?? []).find((x) => x.id === cmd.id);
      if (v) v.aggregateId = cmd.aggregateId;
      break;
    }
    case 'add-relation':
      (model.relations ??= []).push({ sourceId: cmd.sourceId, targetId: cmd.targetId, type: cmd.type });
      break;
    default: break;
  }
}

const shell = document.createElement('archi-shell') as ArchiShell;
shell.model = model;
shell.view = view;
document.body.appendChild(shell);

shell.addEventListener('modux-command', (e) => {
  apply((e as CustomEvent).detail.command as ModuxCommand);
  localStorage.setItem(MK, JSON.stringify(model));
  shell.model = { ...model }; // new ref → the shell re-derives the scene
});
shell.addEventListener('view-changed', (e) => {
  view = (e as CustomEvent).detail.view as View;
  localStorage.setItem(VK, JSON.stringify(view));
  shell.view = view;
});

const bar = document.createElement('div');
bar.style.cssText = 'position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:999;background:#0f172a;color:#cbd5e1;font:12px ui-sans-serif;padding:4px 10px;border-radius:8px;display:flex;gap:10px;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,.2)';
const tag = document.createElement('b');
tag.style.color = '#38bdf8';
tag.textContent = 'SPIKE';
const banner = document.createElement('span');
// the banner follows the editor language, which is only known once the shell is connected
const renderBanner = () => { banner.textContent = t('archi.spike.banner'); };
renderBanner();
onLanguageChange(renderBanner);
bar.append(tag, banner);
const reset = document.createElement('button');
reset.textContent = 'Reset';
reset.style.cssText = 'font:11px ui-sans-serif;border:1px solid #334155;background:#1e293b;color:#cbd5e1;border-radius:5px;padding:2px 8px;cursor:pointer';
reset.onclick = () => { localStorage.removeItem(MK); localStorage.removeItem(VK); location.reload(); };
bar.appendChild(reset);
document.body.appendChild(bar);
