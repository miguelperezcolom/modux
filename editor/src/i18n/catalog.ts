/**
 * The message catalog: one module per editor area under `messages/`, each with an `en` and an
 * `es` table whose keys carry the area prefix. English is the source of truth for the key set.
 */
import * as archi from './messages/archi.js';
import * as canvas from './messages/canvas.js';
import * as editor from './messages/editor.js';
import * as explorer from './messages/explorer.js';
import * as gestures from './messages/gestures.js';
import * as hosts from './messages/hosts.js';
import * as palette from './messages/palette.js';
import * as store from './messages/store.js';
import * as views from './messages/views.js';

/** The per-area tables, exposed for the catalog consistency test. */
export const AREAS = { archi, canvas, editor, explorer, gestures, hosts, palette, store, views };

const en = {
  ...archi.en,
  ...canvas.en,
  ...editor.en,
  ...explorer.en,
  ...gestures.en,
  ...hosts.en,
  ...palette.en,
  ...store.en,
  ...views.en,
};

export type MessageKey = keyof typeof en;

export type Messages = Record<MessageKey, string>;

const es: Messages = {
  ...archi.es,
  ...canvas.es,
  ...editor.es,
  ...explorer.es,
  ...gestures.es,
  ...hosts.es,
  ...palette.es,
  ...store.es,
  ...views.es,
};

export const CATALOGS: Record<'en' | 'es', Messages> = { en, es };
