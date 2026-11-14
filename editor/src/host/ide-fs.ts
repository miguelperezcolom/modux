/**
 * The model's file system, as seen from inside an IDE.
 *
 * Reads go straight through to the host. Writes and deletes are queued and sent
 * as one batch on `commit()` — not to save round trips, but because the IDE
 * turns one batch into one undo step, and one editor gesture should undo once.
 */

import type { FileSystem } from '../store/tree.js';
import { t } from '../i18n/index.js';

/** What the IDE exposes on the page. Requests are plain JSON, replies are values. */
export interface Bridge {
  (request: Record<string, unknown>): Promise<unknown>;
}

export interface IdeFileSystem extends FileSystem {
  /** Send everything queued so far as a single undoable edit. */
  commit(): Promise<void>;
  /** How many file operations are waiting. */
  pending(): number;
}

/**
 * Where another project's model is on this machine, or null when it cannot be found.
 *
 * The coordinate travels with the model (§4.7); turning it into a place on disk is I/O and
 * machine-specific, so the host answers it. Not finding it is an answer, not a failure: the
 * reference's snapshot is what generation reads, and losing sight of the source does not
 * invalidate it — only refreshing it becomes impossible.
 */
export async function resolveProject(
  bridge: Bridge, coordinate: { gitUrl?: string; path?: string },
): Promise<string | null> {
  const root = await bridge({ op: 'resolveProject', ...coordinate });
  return typeof root === 'string' && root ? root : null;
}

/**
 * A read-only view of ANOTHER project's model.
 *
 * Read-only is structural, not a promise: there is no write operation that takes a root, so
 * writing outside the open model is not something this can express.
 */
export function readOnlyFileSystem(bridge: Bridge, root: string): FileSystem {
  const refuse = () => {
    throw new Error(t('hosts.ideFs.readOnlyReference'));
  };
  return {
    list: async (dir) => (await bridge({ op: 'list', path: dir, root })) as string[],
    listDirs: async (dir) => (await bridge({ op: 'listDirs', path: dir, root })) as string[],
    read: async (path) => (await bridge({ op: 'read', path, root })) as string,
    exists: async (path) => (await bridge({ op: 'exists', path, root })) as boolean,
    write: refuse,
    delete: refuse,
  };
}

/**
 * The view document the editor is opened on (§12): its raw YAML text. Separate from the catalog
 * file system — the document is one file, read and written on its own, not part of the tree.
 */
export async function readView(bridge: Bridge): Promise<string> {
  return (await bridge({ op: 'readView' })) as string;
}

/** Overwrite the view document. Its own undo step, apart from a catalog edit. */
export async function writeView(bridge: Bridge, content: string): Promise<void> {
  await bridge({ op: 'writeView', content });
}

/** The bridge the IDE injected, or null when running outside one. */
export function hostBridge(): Bridge | null {
  const bridge = (globalThis as { moduxBridge?: Bridge }).moduxBridge;
  return typeof bridge === 'function' ? bridge : null;
}

export function ideFileSystem(bridge: Bridge): IdeFileSystem {
  const writes = new Map<string, string>();
  const deletes = new Set<string>();

  const queued = (path: string) => writes.has(path);

  return {
    async list(dir) {
      const names = (await bridge({ op: 'list', path: dir })) as string[];
      const queuedHere = [...writes.keys()]
        .filter((p) => p.startsWith(`${dir}/`) && !p.slice(dir.length + 1).includes('/'))
        .map((p) => p.slice(dir.length + 1));
      const deletedHere = new Set([...deletes].map((p) => p.slice(p.lastIndexOf('/') + 1)));
      return [...new Set([...names, ...queuedHere])].filter((n) => !deletedHere.has(`${dir}/${n}`.slice(dir.length + 1)));
    },

    listDirs: async (dir) => (await bridge({ op: 'listDirs', path: dir })) as string[],

    async read(path) {
      // an uncommitted write is what this file says now
      const queuedContent = writes.get(path);
      if (queuedContent !== undefined) return queuedContent;
      return (await bridge({ op: 'read', path })) as string;
    },

    async write(path, content) {
      writes.set(path, content);
      deletes.delete(path);
    },

    async delete(path) {
      writes.delete(path);
      deletes.add(path);
    },

    async exists(path) {
      if (deletes.has(path)) return false;
      if (queued(path)) return true;
      return (await bridge({ op: 'exists', path })) as boolean;
    },

    pending() {
      return writes.size + deletes.size;
    },

    async commit() {
      if (!writes.size && !deletes.size) return;
      const batch = {
        op: 'flush',
        writes: [...writes].map(([path, content]) => ({ path, content })),
        deletes: [...deletes],
      };
      writes.clear();
      deletes.clear();
      await bridge(batch);
    },
  };
}
