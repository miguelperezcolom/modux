/**
 * The Archi-style editor as an IDE plugin hosts it.
 *
 * Same plumbing as {@link ModuxEditorIde} — load the catalog into a ModelStore, apply commands to
 * it, buffer writes, flush on save — but it draws the model with the Archi UX (`<archi-shell>`)
 * instead of `<modux-editor>`. A view is FREE-FORM (no specialized builders): the catalog is the
 * source of truth, and the view document only says WHICH elements it shows and where. The user
 * decides what to include; adding an element creates it in the catalog AND drops it on the view,
 * deleting from the view keeps it in the catalog.
 */

import { parse, stringify } from 'yaml';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { ModuxModel } from '../model.js';
import { normalizeViewLayout, type ViewLayout } from '../scene.js';
import { applyAll, CommandError } from '../store/apply.js';
import { project } from '../store/project.js';
import { ModelStore } from '../store/store.js';
import { flush, loadTree } from '../store/tree.js';
import {
  hostBridge, ideFileSystem, readView, writeView, type IdeFileSystem,
} from './ide-fs.js';
import '../archi-prototype/archi-shell.js';
import type { ArchiShell } from '../archi-prototype/archi-shell.js';

/** One member of a free-form view: an element id and where it sits on the canvas. */
type ViewMember = { id: string; x: number; y: number; w: number; h: number; fill?: string };

/**
 * The view document (§12): self-contained members + geometry. The Archi shell wants members with
 * their geometry inline ({@link ViewMember}); the document keeps ids and geometry separate (member
 * list + a `nodes`/`sizes` map), the shared on-disk shape. This host translates between the two.
 */
interface ViewDoc {
  viewId?: string;
  name?: string;
  memberIds?: string[];
  geometry?: ViewLayout;
}

/** Paths from here are relative to the model root: the host is already rooted there. */
const ROOT = '';
const DEFAULT_W = 200;
const DEFAULT_H = 110;

@customElement('modux-archi-ide')
export class ModuxArchiIde extends LitElement {
  static styles = css`
    :host { display: block; height: 100%; }
    .banner {
      padding: 0.5rem 0.75rem;
      font: 13px/1.4 system-ui, sans-serif;
      background: #fdf2f2;
      color: #8a1f1f;
      border-bottom: 1px solid #f0c9c9;
    }
    archi-shell { height: 100%; }
  `;

  @state() private model: ModuxModel | null = null;
  @state() private members: ViewMember[] = [];
  @state() private error: string | null = null;

  private store = new ModelStore();
  private fs: IdeFileSystem | null = null;
  private doc: ViewDoc = {};

  /** Serializes edits: a command must land before the next one reads the store. */
  private chain: Promise<void> = Promise.resolve();

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    const bridge = hostBridge();
    if (!bridge) {
      this.error = 'Sin puente con el IDE: este componente solo funciona dentro del plugin.';
      return;
    }
    this.fs = ideFileSystem(bridge);
    try {
      this.doc = (parse(await readView(bridge)) as ViewDoc) ?? {};
      this.store = await loadTree(this.fs, ROOT);
      this.members = this.membersFromDoc();
      // The IDE host calls these: Ctrl+S (native save), Cmd/Ctrl+Z / Shift+Z (undo/redo) and
      // Cmd/Ctrl+C / V (copy/paste) — macOS IntelliJ grabs all these keys before the webview, so
      // the plugin re-dispatches them through here (see EditorBridge).
      const w = window as unknown as {
        __moduxSave?: () => void; __moduxUndo?: () => void; __moduxRedo?: () => void;
        __moduxCopy?: () => void; __moduxPaste?: () => void; __moduxReload?: () => void;
      };
      const shell = () => this.renderRoot.querySelector('archi-shell') as ArchiShell | null;
      w.__moduxSave = this.boundSave;
      w.__moduxUndo = () => shell()?.hostUndo();
      w.__moduxRedo = () => shell()?.hostRedo();
      w.__moduxCopy = () => shell()?.hostCopy();
      w.__moduxPaste = () => shell()?.hostPaste();
      // Another view saved a catalog change: re-read the model from disk so this view reflects it
      // (the plugin calls this after any OTHER editor on the same catalog flushes).
      w.__moduxReload = () => void this.reloadFromDisk();
      // Tell the host when a text field is focused so it lets native copy/paste through there
      // instead of routing the clipboard keys to the canvas.
      document.addEventListener('focusin', this.onFocusChange, true);
      document.addEventListener('focusout', this.onFocusChange, true);
      this.refresh();
      console.info(`modux archi: vista abierta — corte=${this.doc.viewId ?? '(todo)'} — ${summary(this.store)}`);
    } catch (e) {
      this.error = `No se pudo abrir la vista: ${message(e)}`;
      console.error(`modux archi: no se pudo abrir la vista: ${message(e)}`);
    }
  }

  /** The document's members with their geometry folded back in, for the shell. */
  private membersFromDoc(): ViewMember[] {
    const geom = normalizeViewLayout(this.doc.geometry);
    const ids = this.doc.memberIds ?? [];
    return ids.map((id, i) => {
      const pos = geom.nodes[id];
      const size = geom.sizes?.[id];
      return {
        id,
        x: pos?.x ?? 140 + (i % 4) * 260,   // auto-grid anything without saved geometry
        y: pos?.y ?? 120 + Math.floor(i / 4) * 180,
        w: size?.w ?? DEFAULT_W,
        h: size?.h ?? DEFAULT_H,
        ...(geom.fills?.[id] ? { fill: geom.fills[id] } : {}),
      };
    });
  }

  /** Re-derive the catalog projection the shell draws. */
  private refresh(): void {
    this.model = project(this.store);
  }

  /**
   * Re-read the catalog from disk after another view changed it, and re-derive. The view document
   * (members + geometry) is this view's own and is kept. Skipped while this view has unsaved work,
   * so a live update never clobbers edits in progress; those views catch up on their next reload.
   */
  private async reloadFromDisk(): Promise<void> {
    if (!this.fs || this.dirty) return;
    try {
      this.store = await loadTree(this.fs, ROOT);
      this.refresh();
    } catch (e) {
      console.error(`modux archi: no se pudo recargar tras cambio externo: ${message(e)}`);
    }
  }

  /** A command from the shell (add/rename/relate/…): apply to the store on the edit chain. */
  private onCommand(event: CustomEvent): void {
    const { command } = event.detail;
    this.chain = this.chain.then(() => this.run(command));
  }

  /**
   * The shell changed the view — which elements it shows and where. The view is the document's
   * data, so this only touches the in-memory buffer; nothing hits disk until save().
   */
  private onViewChanged(event: CustomEvent): void {
    this.members = (event.detail.view.members as ViewMember[]).map((m) => ({ ...m }));
    this.markDirty();
  }

  /** Unsaved work lives in memory (store buffer + this view) until save(). */
  private dirty = false;
  private autosaveTimer: number | undefined;

  private markDirty(): void {
    if (!this.dirty) {
      this.dirty = true;
      const bridge = hostBridge();
      if (bridge) void bridge({ op: 'setModified', modified: true });
    }
    window.clearTimeout(this.autosaveTimer);
    this.autosaveTimer = window.setTimeout(() => void this.save(), 1500);
  }

  /**
   * Apply and buffer — do NOT touch disk. A failed command changes nothing: applyAll rolls the
   * store back atomically, so the in-memory buffer of earlier (unsaved) work is preserved.
   */
  private async run(command: unknown): Promise<void> {
    if (!this.fs) return;
    try {
      applyAll(this.store, [command as never]);
      await flush(this.fs, ROOT, this.store); // queues the writes; commit happens on save()
      this.error = null;
      this.refresh();
      this.markDirty();
    } catch (e) {
      this.error = e instanceof CommandError ? e.message : `No se pudo aplicar: ${message(e)}`;
    }
  }

  /**
   * Save to disk: the buffered catalog writes plus the view document (members + geometry), flushed
   * as one batch. Fired by the debounce, by Ctrl+S, and by the close safety net. Files only — git
   * is left to the user.
   */
  private async save(): Promise<void> {
    window.clearTimeout(this.autosaveTimer);
    const bridge = hostBridge();
    if (!this.fs || !bridge || !this.dirty) return;
    await this.chain; // let any queued command land in the buffer first
    try {
      const nodes: ViewLayout['nodes'] = {};
      const sizes: NonNullable<ViewLayout['sizes']> = {};
      const fills: Record<string, string> = {};
      for (const m of this.members) {
        nodes[m.id] = { x: m.x, y: m.y };
        sizes[m.id] = { w: m.w, h: m.h };
        if (m.fill) fills[m.id] = m.fill;
      }
      this.doc = {
        viewId: this.doc.viewId,
        ...(this.doc.name ? { name: this.doc.name } : {}),
        memberIds: this.members.map((m) => m.id),
        geometry: { nodes, edges: {}, sizes, ...(Object.keys(fills).length ? { fills } : {}) },
      };
      await writeView(bridge, stringify(this.doc));
      await this.fs.commit();
      this.dirty = false;
      void bridge({ op: 'setModified', modified: false });
    } catch (e) {
      this.error = `No se pudo guardar: ${message(e)}`;
    }
  }

  override disconnectedCallback(): void {
    window.clearTimeout(this.autosaveTimer);
    if (this.dirty) void this.save();
    document.removeEventListener('focusin', this.onFocusChange, true);
    document.removeEventListener('focusout', this.onFocusChange, true);
    const w = window as unknown as {
      __moduxSave?: unknown; __moduxUndo?: unknown; __moduxRedo?: unknown; __moduxCopy?: unknown;
      __moduxPaste?: unknown; __moduxReload?: unknown;
    };
    if (w.__moduxSave === this.boundSave) {
      delete w.__moduxSave;
      delete w.__moduxUndo;
      delete w.__moduxRedo;
      delete w.__moduxCopy;
      delete w.__moduxPaste;
      delete w.__moduxReload;
    }
    super.disconnectedCallback();
  }

  /** Stable reference so the IDE host can call save() and disconnect can clear exactly it. */
  private readonly boundSave = () => this.save();

  /** Last text-focus state reported to the host, to avoid chattering the bridge on every focus move. */
  private textFocused = false;
  /**
   * Report whether the deep focus is on an editable field (input/textarea/contenteditable), piercing
   * shadow roots. The plugin reads this to decide whether Cmd/Ctrl+C·V is a text edit (leave native)
   * or a canvas clipboard action (route to the shell).
   */
  private readonly onFocusChange = () => {
    const path = (document as unknown as { activeElement: Element | null });
    let el: Element | null = path.activeElement;
    // Walk into shadow roots to the real focus.
    while (el && (el as HTMLElement & { shadowRoot?: ShadowRoot | null }).shadowRoot?.activeElement) {
      el = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.activeElement;
    }
    const tag = el?.tagName;
    const editable = tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement | null)?.isContentEditable === true;
    if (editable === this.textFocused) return;
    this.textFocused = editable;
    const bridge = hostBridge();
    if (bridge) void bridge({ op: 'setTextFocus', value: editable });
  };

  override render() {
    if (!this.model) {
      return html`<div class="banner">${this.error ?? 'Cargando el modelo…'}</div>`;
    }
    return html`
      ${this.error ? html`<div class="banner" role="alert">${this.error}</div>` : nothing}
      <archi-shell
        .model=${this.model}
        .view=${{ members: this.members }}
        .viewId=${this.doc.viewId}
        @modux-command=${this.onCommand}
        @view-changed=${this.onViewChanged}
      ></archi-shell>
    `;
  }
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** What was read, by type, for the IDE log. */
const summary = (store: ModelStore) =>
  store.types().map((type) => `${type}=${store.all(type).length}`).join(' ') || 'vacío';

declare global {
  interface HTMLElementTagNameMap {
    'modux-archi-ide': ModuxArchiIde;
  }
}
