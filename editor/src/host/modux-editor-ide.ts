/**
 * The editor as an IDE plugin hosts it.
 *
 * The web-app host (`modux-editor-connected`) POSTs commands to a server and
 * waits for a new model back. This one applies them itself and writes the files
 * — same editor, same commands, no server. See `docs/design/ide-plugin.md`.
 */

import { parse, stringify } from 'yaml';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { ModuxModel } from '../model.js';
import type { DiagramLayout, EditorLayout, ViewLayout } from '../scene.js';
import { applyAll, CommandError } from '../store/apply.js';
import { snapshotOf } from '../store/project-snapshot.js';
import { project, unprojectedTypes } from '../store/project.js';
import { asList, ModelStore } from '../store/store.js';
import { flush, loadTree } from '../store/tree.js';
import {
  hostBridge, ideFileSystem, readOnlyFileSystem, resolveProject, readView, writeView,
  type IdeFileSystem,
} from './ide-fs.js';
import '../modux-editor.js';
import { LanguageController, t } from '../i18n/index.js';

/**
 * The view document — now SELF-CONTAINED: it carries its own members and geometry, so a view is
 * one file. There is no `.modux/views/` catalog entry anymore; copying the file gives a fully
 * independent view, and renaming it is harmless. (Legacy docs without `memberIds` fall back to the
 * old catalog entry once, then migrate on save.)
 */
interface ViewDoc {
  viewId?: string;
  name?: string;
  memberIds?: string[];
  geometry?: ViewLayout | DiagramLayout;
  /** The lens the view opens in — so a C4 container view reopens in distribution, not unified. */
  mode?: 'unified' | 'distribution' | 'eventstorming';
}

/**
 * The single geometry key for a document — mirrors `ModuxEditor.layoutKey`. One canvas, one key: a
 * scoped document keys under its view id, the whole model under «base».
 */
function layoutKeyFor(viewId?: string): string {
  return viewId ? `view:${viewId}` : 'base';
}

/** Paths from here are relative to the model root: the host is already rooted there. */
const ROOT = '';

@customElement('modux-editor-ide')
export class ModuxEditorIde extends LitElement {
  static styles = css`
    :host { display: block; height: 100%; }
    .banner {
      padding: 0.5rem 0.75rem;
      font: 13px/1.4 system-ui, sans-serif;
      background: #fdf2f2;
      color: #8a1f1f;
      border-bottom: 1px solid #f0c9c9;
    }
    .banner.info { background: #f2f6fd; color: #1f3d8a; border-bottom-color: #c9d8f0; }
    modux-editor { height: 100%; }
  `;

  readonly _i18n = new LanguageController(this, { root: true });

  @state() private model: ModuxModel | null = null;
  @state() private layout: EditorLayout = {};
  @state() private error: string | null = null;
  @state() private notice: string | null = null;
  /** The lens + scope to open at, handed to the editor once the catalog is in. */
  @state() private open: { activeViewId?: string; mode?: ViewDoc['mode'] } | null = null;

  private store = new ModelStore();
  private fs: IdeFileSystem | null = null;

  /** The view document this editor is bound to: its ref and where its geometry keys. */
  private doc: ViewDoc = {};
  private viewKey = 'base';

  /** Serializes edits: a command must land before the next one reads the store. */
  private chain: Promise<void> = Promise.resolve();


  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    const bridge = hostBridge();
    if (!bridge) {
      this.error = t('hosts.ide.noBridge');
      return;
    }
    this.fs = ideFileSystem(bridge);
    try {
      // The document scopes to a catalog view and carries geometry; the catalog (.modux/) holds the
      // elements. There is one unified canvas now (no type), so the geometry seeds under one key.
      // A legacy `<slug>.<type>.modux-view.yaml` still opens — the type in the name is ignored.
      this.doc = (parse(await readView(bridge)) as ViewDoc) ?? {};
      this.viewKey = layoutKeyFor(this.doc.viewId);
      this.store = await loadTree(this.fs, ROOT);
      this.seedView();
      this.layout = this.doc.geometry ? { [this.viewKey]: this.doc.geometry } : {};
      this.open = { activeViewId: this.doc.viewId, mode: this.doc.mode };
      this.canvasMode = this.doc.mode;
      // The IDE host calls these: Ctrl+S (native save), and Cmd/Ctrl+Z / Shift+Z (macOS IntelliJ
      // grabs the undo keys before the webview, so the plugin re-dispatches them through here).
      const w = window as unknown as { __moduxSave?: () => void; __moduxUndo?: () => void; __moduxRedo?: () => void };
      const editorEl = () => this.renderRoot.querySelector('modux-editor') as
        (Element & { hostUndo(): void; hostRedo(): void }) | null;
      w.__moduxSave = this.boundSave;
      w.__moduxUndo = () => editorEl()?.hostUndo();
      w.__moduxRedo = () => editorEl()?.hostRedo();
      this.refresh();
      // the host has no other window into the webview: without this, a model that
      // loaded and one that never got here look the same from the IDE log
      console.info(`modux: vista abierta — corte=${this.doc.viewId ?? '(todo)'} — ${summary(this.store)}`);
    } catch (e) {
      this.error = t('hosts.ide.openViewFailed', { message: message(e) });
      console.error(`modux: no se pudo abrir la vista: ${message(e)}`);
    }
  }

  /** Re-derive what the editor draws, and warn about anything not projected yet. */
  private refresh(): void {
    this.model = project(this.store);
    const missing = unprojectedTypes(this.store);
    this.notice = missing.length
      ? t('hosts.ide.unprojectedTypes', { types: missing.join(', ') })
      : null;
  }

  private onCommand(event: CustomEvent): void {
    const { command } = event.detail;
    this.chain = this.chain.then(() => this.run(command));
  }

  /**
   * Author the active view in memory FROM ITS DOCUMENT (the self-contained source of truth). It is
   * never written to `.modux/views/` — flush skips views. A legacy doc without `memberIds` falls
   * back to its old catalog entry (loaded from `.modux/views/`), then migrates to the doc on save.
   */
  private seedView(): void {
    const id = this.doc.viewId;
    if (!id) return;
    const legacy = asList(this.store.get('views', id)?.memberIds as string[] | undefined);
    this.store.put('views', {
      id,
      name: this.doc.name ?? id,
      kind: 'CURATED',
      memberIds: this.doc.memberIds ?? legacy,
    });
  }

  /**
   * A view was created in the editor (the "create view from selection" gesture, §12): its entity is
   * already added to the catalog (queued on the same chain, so it lands first), and now its
   * document is written and opened. This is what makes the in-editor door and New → Modux View
   * produce the same thing — a document backed by a catalog view.
   */
  private onCreateView(event: CustomEvent): void {
    const bridge = hostBridge();
    if (!bridge) return;
    const { viewId, name, memberIds } = event.detail as { viewId: string; name: string; memberIds?: string[] };
    // A view is self-contained: seed the new document with its members so the selection survives the
    // hop to the freshly-opened file (there is no `.modux/views/` entry to read them back from).
    this.chain = this.chain.then(() => bridge({ op: 'createView', viewId, name, memberIds: memberIds ?? [] }) as Promise<unknown>)
      .then(() => undefined);
  }

  /**
   * The one command that needs the outside world: referencing another project means READING its
   * model. The applier does no I/O, so the host does it here and hands over the snapshot already
   * read — see `docs/design/ide-plugin.md` §4.7.
   *
   * Not finding the other project is reported, not thrown: it is an ordinary situation (a sibling
   * that is not checked out) and the user can fix it by cloning it or giving the reference a path.
   */
  private async enrich(command: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (command.kind !== 'add-project-reference') return command;
    const bridge = hostBridge();
    const coordinate = (command.referencedProject ?? {}) as { gitUrl?: string; path?: string };
    if (!bridge) throw new CommandError(t('hosts.ide.noBridgeShort'));
    const root = await resolveProject(bridge, coordinate);
    if (!root) {
      throw new CommandError(
        t('hosts.ide.referencedModelNotFound', { project: coordinate.gitUrl ?? coordinate.path }));
    }
    const other = await loadTree(readOnlyFileSystem(bridge, root), ROOT);
    const fallback = root.split('/').filter(Boolean).at(-1) ?? 'proyecto';
    return { ...command, snapshot: snapshotOf(other, fallback) };
  }

  /**
   * The geometry belongs to the view DOCUMENT now (§12), not to the catalog's `diagrams`. So a
   * drag lands in the document file — its own undo step — and the catalog is left untouched.
   */
  private onLayoutChanged(event: CustomEvent): void {
    this.layout = event.detail.layout as EditorLayout;
    // Geometry now rides in the in-memory buffer; nothing hits disk until the user saves.
    this.markDirty();
  }

  /** The lens changed in the editor — remember it (persisted with the document on save). */
  private onCanvasModeChanged(event: CustomEvent): void {
    this.canvasMode = event.detail.mode as ViewDoc['mode'];
    this.markDirty();
  }

  /** The lens the view is currently in, persisted with the document (undefined ⇒ unified). */
  private canvasMode: ViewDoc['mode'];

  /** Unsaved work lives in memory (the store + `ideFileSystem`'s write buffer) until save(). */
  private dirty = false;
  /** Debounced auto-save to disk — the safety net so work is never lost. Git stays manual. */
  private autosaveTimer: number | undefined;

  /** Mark dirty, tell the host (modified indicator), and arm the debounced auto-save. */
  private markDirty(): void {
    if (!this.dirty) {
      this.dirty = true;
      const bridge = hostBridge();
      if (bridge) void bridge({ op: 'setModified', modified: true });
    }
    // Auto-save to disk shortly after edits settle; Ctrl+S still forces an immediate save. Only
    // files are written — never git — so the user keeps full control of what gets committed.
    window.clearTimeout(this.autosaveTimer);
    this.autosaveTimer = window.setTimeout(() => void this.save(), 1500);
  }

  /**
   * Save to disk: the buffered writes (commands + drags queued in `ideFileSystem`) plus the view
   * document, flushed as one batch. Fired by the debounce, by Ctrl+S, and by the close safety net.
   * Writes files only — git is left to the user.
   */
  private async save(): Promise<void> {
    window.clearTimeout(this.autosaveTimer);
    const bridge = hostBridge();
    if (!this.fs || !bridge || !this.dirty) return;
    await this.chain; // let any queued command land in the buffer first
    try {
      // The document is self-contained: its members (from the in-memory view) and geometry, plus
      // the lens. Written as one file — no `.modux/views/` entry.
      const id = this.doc.viewId;
      const view = id ? this.store.get('views', id) : undefined;
      this.doc = {
        viewId: id,
        ...(view?.name ? { name: String(view.name) } : {}),
        memberIds: asList(view?.memberIds as string[] | undefined),
        geometry: this.layout[this.viewKey] ?? { nodes: {}, edges: {} },
        ...(this.canvasMode && this.canvasMode !== 'unified' ? { mode: this.canvasMode } : {}),
      };
      await writeView(bridge, stringify(this.doc));
      // Migration: the members live in the doc now — drop the legacy `.modux/views/` entry if any.
      if (id) {
        const legacy = `views/${id}.yaml`;
        if (await this.fs.exists(legacy)) await this.fs.delete(legacy);
      }
      await this.fs.commit();
      this.dirty = false;
      void bridge({ op: 'setModified', modified: false });
    } catch (e) {
      this.error = t('hosts.ide.saveFailed', { message: message(e) });
    }
  }

  override disconnectedCallback(): void {
    // Flush anything still pending before the element goes (the debounce may not have fired yet).
    window.clearTimeout(this.autosaveTimer);
    if (this.dirty) void this.save();
    const w = window as unknown as { __moduxSave?: unknown; __moduxUndo?: unknown; __moduxRedo?: unknown };
    if (w.__moduxSave === this.boundSave) {
      delete w.__moduxSave;
      delete w.__moduxUndo;
      delete w.__moduxRedo;
    }
    super.disconnectedCallback();
  }

  /** Stable reference so the IDE host can call save() and disconnect can clear exactly it. */
  private readonly boundSave = () => this.save();

  /**
   * Apply and buffer — do NOT touch disk. A failed command changes nothing: applyAll rolls the
   * store back atomically, so the in-memory buffer of earlier (unsaved) work is preserved (we must
   * not reload from disk, which is now behind the buffer).
   */
  private async run(command: unknown): Promise<void> {
    if (!this.fs) return;
    try {
      const enriched = await this.enrich(command as Record<string, unknown>);
      applyAll(this.store, [enriched as never]);
      await flush(this.fs, ROOT, this.store); // queues the writes; commit happens on save()
      this.error = null;
      this.refresh();
      this.markDirty();
    } catch (e) {
      this.error = e instanceof CommandError ? e.message : t('hosts.ide.applyFailed', { message: message(e) });
    }
  }

  override render() {
    if (!this.model) {
      return html`<div class="banner">${this.error ?? t('hosts.loadingModel')}</div>`;
    }
    return html`
      ${this.error ? html`<div class="banner" role="alert">${this.error}</div>` : nothing}
      ${this.notice && !this.error ? html`<div class="banner info">${this.notice}</div>` : nothing}
      <modux-editor
        .model=${this.model}
        .layout=${this.layout}
        .open=${this.open}
        .hosted=${true}
        @modux-command=${this.onCommand}
        @layout-changed=${this.onLayoutChanged}
        @canvas-mode-changed=${this.onCanvasModeChanged}
        @create-view=${this.onCreateView}
      ></modux-editor>
    `;
  }
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** What was read, by type, for the IDE log. */
const summary = (store: ModelStore) =>
  store.types().map((type) => `${type}=${store.all(type).length}`).join(' ') || 'vacío';

declare global {
  interface HTMLElementTagNameMap {
    'modux-editor-ide': ModuxEditorIde;
  }
}
