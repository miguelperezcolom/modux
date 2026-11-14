/**
 * The editor's i18n layer: a typed message catalog (`en`, `es`) and a `t()` lookup.
 *
 * The language is chosen, in order, from:
 *   1. an explicit `lang` attribute (or property) on a root editor element — `<modux-editor>`,
 *      `<modux-editor-connected>`, `<modux-editor-ide>`, `<modux-archi-ide>`, `<archi-shell>`,
 *      `<modux-explorer>` — or a `setLanguage()` call;
 *   2. `document.documentElement.lang`;
 *   3. `navigator.language`.
 * Anything starting with `es` is Spanish; everything else is English, the default.
 *
 * The language is page-wide: one editor per page is the norm, so a root element's explicit `lang`
 * applies to every editor component on the page (nested ones included).
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { CATALOGS, type MessageKey } from './catalog.js';

export type { MessageKey } from './catalog.js';

export type Language = 'en' | 'es';

export const LANGUAGES: readonly Language[] = ['en', 'es'];

export const DEFAULT_LANGUAGE: Language = 'en';

/** Maps a BCP 47 tag to a supported language; undefined for an empty tag. */
export function normalizeLanguage(tag: string | null | undefined): Language | undefined {
  const value = tag?.trim().toLowerCase();
  if (!value) return undefined;
  return value.startsWith('es') ? 'es' : 'en';
}

let explicit: Language | undefined;
const listeners = new Set<() => void>();

/** Sets the editor language explicitly; an empty/null tag falls back to the page and the browser. */
export function setLanguage(tag: string | null | undefined): void {
  const next = normalizeLanguage(tag);
  if (next === explicit) return;
  const before = language();
  explicit = next;
  if (language() !== before) listeners.forEach((listener) => listener());
}

/** The language messages are rendered in right now. */
export function language(): Language {
  return (
    explicit ??
    normalizeLanguage(typeof document !== 'undefined' ? document.documentElement?.lang : undefined) ??
    normalizeLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined) ??
    DEFAULT_LANGUAGE
  );
}

/** Subscribes to language changes; returns the unsubscribe function. */
export function onLanguageChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type MessageParams = Record<string, unknown>;

/**
 * The message for `key` in the current language, with `{name}` placeholders replaced from
 * `params`. A key missing in the current language falls back to English, then to the key itself.
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const template: string = CATALOGS[language()][key] ?? CATALOGS[DEFAULT_LANGUAGE][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Re-renders a Lit element when the language changes. With `root: true` the element is a root
 * editor element: its own `lang` attribute (set in markup or via the native `lang` property) is
 * the explicit language for the page.
 */
export class LanguageController implements ReactiveController {
  private off: (() => void) | undefined;
  private observer: MutationObserver | undefined;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: { root?: boolean } = {},
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    if (this.options.root) {
      const own = this.host.getAttribute('lang');
      if (own) setLanguage(own);
      if (typeof MutationObserver !== 'undefined') {
        this.observer = new MutationObserver(() => setLanguage(this.host.getAttribute('lang')));
        this.observer.observe(this.host, { attributes: true, attributeFilter: ['lang'] });
      }
    }
    this.off = onLanguageChange(() => this.host.requestUpdate());
  }

  hostDisconnected(): void {
    this.off?.();
    this.off = undefined;
    this.observer?.disconnect();
    this.observer = undefined;
  }
}
