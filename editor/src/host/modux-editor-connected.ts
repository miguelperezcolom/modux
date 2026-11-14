import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ModuxModel } from '../model.js';
import type { EditorLayout } from '../scene.js';
import type { ModuxEditor } from '../modux-editor.js';
import { MODUX_THEME } from '../theme.js';
import '../modux-editor.js';
import { LanguageController, t } from '../i18n/index.js';

/**
 * REST-connected host wrapper. Use this element when embedding the editor in
 * the Mateu UI served by the modux app: it loads the model projection and the
 * persisted layout from the server, forwards commands, and saves the layout.
 * The inner <modux-editor> stays pure (properties in, events out).
 */
@customElement('modux-editor-connected')
export class ModuxEditorConnected extends LitElement {
  /** Base URL of the editor API. */
  @property() base = '/modux/editor';

  readonly _i18n = new LanguageController(this, { root: true });

  @state() private _model: ModuxModel | null = null;
  @state() private _layout: EditorLayout = {};
  @state() private _error: string | null = null;
  @state() private _saving = false;
  /** In-flight writes of our own (commands, layout saves) — see trackWrite. */
  private _writes = 0;
  @state() private _toast: { message: string; kind: 'error' | 'info' } | null = null;
  private _layoutTimer: number | undefined;
  /** A layout edit is waiting for the debounced PUT. */
  private _layoutDirty = false;
  private _toastTimer: number | undefined;
  private _pollTimer: number | undefined;
  private _lastVersion: string | null = null;
  private _pendingVersion: string | null = null;
  private _interacting = false;

  /** Mirrors mateu's dark mode: <html theme="dark"> + localStorage 'mateu-theme'. */
  @state() private _dark = false;
  private _themeObserver: MutationObserver | undefined;

  private _onPointerDown = () => (this._interacting = true);
  private _onPointerUp = () => {
    this._interacting = false;
    if (this._pendingVersion) {
      const version = this._pendingVersion;
      this._pendingVersion = null;
      void this.onVersionSignal(version);
    }
  };

  static styles = [
    MODUX_THEME,
    css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 480px;
    }
    modux-editor {
      width: 100%;
      flex: 1;
      min-height: 0;
    }
    .status {
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 13px;
      color: var(--modux-text-dim);
      padding: 24px;
    }
    .status.error {
      color: var(--modux-danger);
    }
    :host {
      position: relative;
    }
    .toast {
      position: absolute;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 80%;
      background: #7f1d1d;
      color: #fef2f2;
      font: 13px ui-sans-serif, system-ui, sans-serif;
      padding: 10px 16px;
      border-radius: 8px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
      cursor: pointer;
      z-index: 10;
    }
    .toast.info {
      background: #1e3a8a;
      color: #eff6ff;
    }
  `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('pointerdown', this._onPointerDown, true);
    window.addEventListener('pointerup', this._onPointerUp, true);
    window.addEventListener('pagehide', this._onPageHide);
    void this.reload();
    this.startLiveUpdates();
    // Coordinated with mateu: same flag, live when its top-bar toggle flips it.
    this._dark = (document.documentElement.getAttribute('theme')
      ?? localStorage.getItem('mateu-theme')) === 'dark';
    this._themeObserver = new MutationObserver(() => {
      this._dark = document.documentElement.getAttribute('theme') === 'dark';
    });
    this._themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['theme'],
    });
  }

  protected updated(): void {
    this.toggleAttribute('dark', this._dark);
  }

  disconnectedCallback(): void {
    window.clearTimeout(this._layoutTimer);
    window.clearInterval(this._pollTimer);
    this._themeObserver?.disconnect();
    this.removeEventListener('pointerdown', this._onPointerDown, true);
    window.removeEventListener('pointerup', this._onPointerUp, true);
    window.removeEventListener('pagehide', this._onPageHide);
    this._onPageHide(); // navigating away inside the SPA also flushes
    super.disconnectedCallback();
  }

  /** Closing/leaving inside the debounce window must not lose the last layout edit. */
  private _onPageHide = (): void => {
    if (!this._layoutDirty) return;
    this._layoutDirty = false;
    // sendBeacon survives unload where a plain fetch may be dropped (POST-only).
    navigator.sendBeacon(
      `${this.base}/layout`,
      new Blob([JSON.stringify(this._layout)], { type: 'application/json' }),
    );
  };

  /**
   * Live refresh: poll the store fingerprint and refetch the model when it moves,
   * covering edits made outside this editor — by hand in the YAML, or by an agent.
   *
   * <p>It used to be an SSE push instead, which is a thing only a server can do. There is no
   * server to push from once the model is a file in the repository, so the fallback became the
   * mechanism. Signals are deferred while the user is mid-gesture or a command is in flight.
   */
  private startLiveUpdates(): void {
    this._pollTimer = window.setInterval(() => void this.pollVersion(), 4000);
  }

  private async pollVersion(): Promise<void> {
    try {
      const res = await fetch(`${this.base}/version`);
      if (!res.ok) return;
      await this.onVersionSignal((await res.json()).version);
    } catch {
      /* transient network issue — next tick retries */
    }
  }

  /**
   * Every write WE make (command, layout save) bumps the store
   * fingerprint, and seeing our own bump come back must not read as an external
   * change (it reloaded the model and wiped the undo history mid-session).
   * All own writes funnel through here: while any is in flight the signals are
   * deferred, and once the last one settles we adopt the resulting version
   * BEFORE processing the deferred signal — our own echo compares equal.
   */
  private async trackWrite<T>(work: () => Promise<T>): Promise<T> {
    this._writes++;
    this._saving = true;
    try {
      return await work();
    } finally {
      this._writes--;
      if (this._writes === 0) {
        try {
          const res = await fetch(`${this.base}/version`);
          if (res.ok) this._lastVersion = (await res.json()).version;
        } catch {
          /* transient — the next signal will sort it out */
        }
        this._saving = false;
        if (this._pendingVersion) {
          const version = this._pendingVersion;
          this._pendingVersion = null;
          void this.onVersionSignal(version);
        }
      }
    }
  }

  private async onVersionSignal(version: string): Promise<void> {
    if (!this._model) return;
    if (this._writes > 0 || this._interacting) {
      this._pendingVersion = version; // processed on pointerup / after the last write
      return;
    }
    const external = this._lastVersion !== null && version !== this._lastVersion;
    this._lastVersion = version;
    if (external) {
      await this.reload();
      // Someone else changed the model: the local undo history no longer
      // describes valid inverses, so it is discarded rather than misapplied.
      (this.renderRoot.querySelector('modux-editor') as ModuxEditor | null)?.clearHistory();
      this.showToast(
        t('hosts.connected.reloadedExternally'),
        'info',
      );
    }
  }

  async reload(): Promise<void> {
    try {
      const [modelRes, layoutRes, versionRes] = await Promise.all([
        fetch(`${this.base}/model`),
        fetch(`${this.base}/layout`),
        fetch(`${this.base}/version`),
      ]);
      if (!modelRes.ok) throw new Error(`GET ${this.base}/model → ${modelRes.status}`);
      this._model = await modelRes.json();
      this._layout = layoutRes.ok ? await layoutRes.json() : {};
      if (versionRes.ok) this._lastVersion = (await versionRes.json()).version;
      this._error = null;
    } catch (err) {
      this._error = String(err);
    }
  }

  private showToast(message: string, kind: 'error' | 'info' = 'error'): void {
    this._toast = { message, kind };
    window.clearTimeout(this._toastTimer);
    this._toastTimer = window.setTimeout(() => (this._toast = null), 5000);
  }

  /** Commands run strictly in order: two concurrent edits of the same entity
   * would read-modify-write against each other and lose one of them. */
  private _commandChain: Promise<void> = Promise.resolve();

  private onCommand(e: CustomEvent): void {
    const { command } = e.detail;
    this._commandChain = this._commandChain.then(() => this.postCommand(command));
  }

  private async postCommand(command: unknown): Promise<void> {
    await this.trackWrite(async () => {
      try {
        const res = await fetch(`${this.base}/commands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        });
        if (!res.ok) {
          // Rejections arrive as 400 + {message}; anything else gets a generic line.
          let message = t('hosts.connected.commandRejected', { status: res.status });
          try {
            const body = await res.json();
            if (body?.message) message = body.message;
          } catch {
            /* not JSON */
          }
          this.showToast(message);
          return;
        }
        // The server is the source of truth: re-read the projection.
        const modelRes = await fetch(`${this.base}/model`);
        if (modelRes.ok) this._model = await modelRes.json();
      } catch (err) {
        this.showToast(String(err));
      }
    });
  }

  private onLayoutChanged(e: CustomEvent): void {
    this._layout = e.detail.layout;
    this._layoutDirty = true;
    window.clearTimeout(this._layoutTimer);
    this._layoutTimer = window.setTimeout(() => {
      this._layoutDirty = false;
      void this.trackWrite(() =>
        fetch(`${this.base}/layout`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this._layout),
        }),
      );
    }, 600);
  }

  render() {
    if (this._error) {
      return html`<div class="status error">modux editor: ${this._error}</div>`;
    }
    if (!this._model) {
      return html`<div class="status">${t('hosts.loadingModel')}</div>`;
    }
    return html`
      <modux-editor
        ?dark=${this._dark}
        .model=${this._model}
        .layout=${this._layout}
        @modux-command=${this.onCommand}
        @layout-changed=${this.onLayoutChanged}
        @modux-notice=${(e: CustomEvent) =>
          this.showToast(e.detail.message, e.detail.kind ?? 'info')}
        style=${this._saving ? 'opacity: 0.7' : ''}
      ></modux-editor>
      ${this._toast
        ? html`<div
            class="toast ${this._toast.kind}"
            role="alert"
            @click=${() => (this._toast = null)}
          >
            ${this._toast.kind === 'error' ? '⚠' : 'ℹ'} ${this._toast.message}
          </div>`
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'modux-editor-connected': ModuxEditorConnected;
  }
}
