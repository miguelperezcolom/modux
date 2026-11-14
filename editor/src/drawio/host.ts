/**
 * The draw.io host: a second editor surface for a view document that edits the STRATEGIC tier in
 * draw.io instead of our own canvas.
 *
 * It reuses everything: the same Java file protocol (`ide-fs`), the same store (`loadTree`/`flush`),
 * the same view document. Only the canvas is different — draw.io, embedded in an iframe, talking
 * over `postMessage`. The model logic stays in TypeScript (Java only moves bytes), so a save writes
 * the very files the generator reads.
 *
 *   open : .modux + view  ──loadTree──▶ store ──stratFromStore──▶ StratModel ──toMx──▶ draw.io
 *   save : draw.io XML ──fromMx──▶ StratModel ──applyStratToStore──▶ store ──flush──▶ .modux
 */

import { parse, stringify } from 'yaml';
import { flush, loadTree } from '../store/tree.js';
import { ideFileSystem, hostBridge, readView, writeView, type IdeFileSystem } from '../host/ide-fs.js';
import { ModelStore } from '../store/store.js';
import { toMx, fromMx, type StratModel } from './bridge.js';
import { stratFromStore, applyStratToStore, geometryFrom, type ViewDocLike } from './adapter.js';
import { t } from '../i18n/index.js';

// The bridge's file ops are already relative to the catalog (`.modux/`), so the tree root is empty
// — bucket names sit directly under it (`systems/`, `boundedContexts/`), not `.modux/systems/`.
const ROOT = '';
/** Same-origin: the vendored draw.io the plugin serves next to this page. Offline, stealth. */
const DRAWIO_SRC =
  './drawio/index.html?embed=1&proto=json&ui=min&spin=1&stealth=1&offline=1' +
  '&modified=unsavedChanges&noSaveBtn=1&saveAndExit=0&noExitBtn=1&picker=0';

class DrawioHost {
  private fs!: IdeFileSystem;
  private store!: ModelStore;
  private doc: ViewDocLike = {};
  private iframe!: HTMLIFrameElement;
  private ready = false;
  private saving = false;

  async start(): Promise<void> {
    const bridge = hostBridge();
    if (!bridge) {
      this.fail(t('hosts.drawio.noBridge'));
      return;
    }
    try {
      this.fs = ideFileSystem(bridge);
      this.doc = (parse(await readView(bridge)) as ViewDocLike) ?? {};
      this.store = await loadTree(this.fs, ROOT);
    } catch (e) {
      this.fail(t('hosts.drawio.openModelFailed', { message: msg(e) }));
      return;
    }

    this.iframe = document.createElement('iframe');
    this.iframe.id = 'drawio';
    this.iframe.setAttribute('frameborder', '0');
    this.iframe.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;';
    this.iframe.src = DRAWIO_SRC;
    document.body.appendChild(this.iframe);

    window.addEventListener('message', (e) => void this.onMessage(e));
    // Native Ctrl+S routes here; draw.io autosave already persists, so this just confirms clean.
    (window as { __moduxSave?: () => void }).__moduxSave = () => void this.persist();
  }

  private post(msg: Record<string, unknown>): void {
    this.iframe.contentWindow?.postMessage(JSON.stringify(msg), '*');
  }

  private async onMessage(e: MessageEvent): Promise<void> {
    if (e.source !== this.iframe.contentWindow) return;
    let m: { event?: string; xml?: string };
    try {
      m = JSON.parse(String(e.data));
    } catch {
      return; // draw.io also posts non-JSON chatter
    }
    switch (m.event) {
      case 'init': {
        const model = stratFromStore(this.store, this.doc);
        this.post({ action: 'load', autosave: 1, xml: toMx(model) });
        this.ready = true;
        break;
      }
      case 'autosave':
      case 'save':
        if (this.ready && m.xml) await this.apply(m.xml);
        break;
    }
  }

  /** draw.io XML → model. Parse, land in the store, persist geometry + membership, flush. */
  private async apply(xml: string): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    try {
      const model = fromMx(xml, mintNodeId);
      normalizeNewEdgeIds(model); // fresh edges get the `ar-src-tgt-type` id the catalog uses
      applyStratToStore(this.store, model);
      this.doc.memberIds = this.reconcileMembers(model.nodes.map((n) => n.id));
      this.doc.geometry = geometryFrom(model, this.doc.geometry);
      await this.persist();
    } catch (e) {
      console.error('modux/drawio: fallo al aplicar', e);
    } finally {
      this.saving = false;
    }
  }

  /**
   * The view's members after an edit: the strategic nodes now on the canvas, plus any member the
   * draw.io surface never showed (a non-strategic element added from the modux canvas). A strategic
   * node the user deleted in draw.io thus leaves the VIEW — but not the model: a view is a lens, and
   * dropping something from the picture is not deleting it. (Relations, by contrast, are deleted;
   * see the adapter.)
   */
  private reconcileMembers(diagramIds: string[]): string[] {
    const STRAT = ['systems', 'boundedContexts', 'externalSystems', 'roles'];
    const isStrategic = (id: string): boolean => STRAT.some((b) => this.store.has(b, id));
    const kept = (this.doc.memberIds ?? []).filter((id) => !isStrategic(id));
    return [...new Set([...kept, ...diagramIds])];
  }

  /** Flush buffered catalog writes + the view document, as one undoable batch. */
  private async persist(): Promise<void> {
    const bridge = hostBridge();
    if (!bridge) return;
    await flush(this.fs, ROOT, this.store);
    await writeView(bridge, stringify(this.doc));
    await this.fs.commit();
    void bridge({ op: 'setModified', modified: false });
  }

  private fail(text: string): void {
    document.body.innerHTML = `<pre style="padding:16px;font:13px monospace;color:#b85450">${text}</pre>`;
  }
}

/** A brand-new node (drawn in draw.io, no moduxId) gets a real UUID, as the model expects. */
function mintNodeId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `n-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
}

/**
 * Fresh edges come out of `fromMx` with a minted id; rewrite them to the catalog's convention
 * (`ar-<source>-<target>-<type>`) so a hand-drawn relation lands in the same file shape as one
 * modux wrote. Existing edges keep their id (they carried a `moduxId`).
 */
function normalizeNewEdgeIds(model: StratModel): void {
  for (const e of model.edges) {
    if (e.id.startsWith('n-') || e.id.startsWith('mint') || !e.id.startsWith('ar-')) {
      e.id = `ar-${e.sourceId}-${e.targetId}-${e.relType}`;
    }
  }
}

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

void new DrawioHost().start();
