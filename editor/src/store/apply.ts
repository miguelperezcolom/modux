/**
 * The applier: turns a `ModuxCommand` into changes on the store.
 *
 * This is what the IDE plugin runs in place of POSTing to a server. The editor
 * keeps emitting exactly the same commands it emits today; only who applies
 * them moves.
 */

import type { ModuxCommand } from '../commands.js';
import { ACTOR_COMMANDS } from './commands/actors.js';
import { AGENT_COMMANDS } from './commands/agents.js';
import { API_COMMANDS } from './commands/apis.js';
import { APP_COMMANDS } from './commands/apps.js';
import { BEHAVIOR_COMMANDS } from './commands/behavior.js';
import { CORE_COMMANDS } from './commands/core.js';
import { CRUD_COMMANDS } from './commands/crud.js';
import { EXTERNAL_COMMANDS } from './commands/externals.js';
import { FLOW_COMMANDS } from './commands/flows.js';
import { LOOSE_COMMANDS } from './commands/loose.js';
import { MODEL_COMMANDS } from './commands/models.js';
import { PAGE_COMMANDS } from './commands/pages.js';
import { PLATFORM_COMMANDS } from './commands/platform.js';
import { READSIDE_COMMANDS } from './commands/readside.js';
import { RENAME_COMMANDS } from './commands/rename.js';
import { RETYPE_COMMANDS } from './commands/retype.js';
import { UI_COMMANDS } from './commands/ui-wiring.js';
import { WORKFLOW_COMMANDS } from './commands/workflows.js';
import type { Changes, ModelStore } from './store.js';
import { CommandError, type Command, type Handler } from './spec.js';

/** Every command kind the applier knows, by block. */
export const HANDLERS: Record<string, Handler> = {
  ...CORE_COMMANDS,
  ...ACTOR_COMMANDS,
  ...API_COMMANDS,
  ...BEHAVIOR_COMMANDS,
  ...EXTERNAL_COMMANDS,
  ...FLOW_COMMANDS,
  ...READSIDE_COMMANDS,
  ...CRUD_COMMANDS,
  ...UI_COMMANDS,
  ...RENAME_COMMANDS,
  ...RETYPE_COMMANDS,
  // the UI block
  ...APP_COMMANDS,
  ...PAGE_COMMANDS,
  ...MODEL_COMMANDS,
  ...PLATFORM_COMMANDS,
  // orchestration and agents
  ...WORKFLOW_COMMANDS,
  ...AGENT_COMMANDS,
  ...LOOSE_COMMANDS,
};

export { CommandError };

/** Whether a command kind can be applied yet. */
export function supports(kind: string): boolean {
  return kind in HANDLERS;
}

/** Command kinds the editor can emit that are not ported yet. */
export function unsupported(kinds: string[]): string[] {
  return kinds.filter((kind) => !supports(kind));
}

/**
 * Apply one command and return the files that must be written or deleted.
 *
 * The store is mutated in place. On failure it may be left partially changed,
 * so a host that cares should apply against a snapshot — see `applyAll`.
 */
export function apply(store: ModelStore, command: ModuxCommand | Command): Changes {
  const handler = HANDLERS[command.kind];
  if (!handler) throw new CommandError(`Comando no soportado: ${command.kind}`);
  store.clearChanges();
  handler(store, command as Command);
  return store.changes();
}

/**
 * Apply a batch atomically: either every command lands, or the store is left
 * untouched. Undo/redo and multi-step gestures replay through here.
 */
export function applyAll(store: ModelStore, commands: (ModuxCommand | Command)[]): Changes {
  const snapshot = store.toData();
  store.clearChanges();
  try {
    for (const command of commands) {
      const handler = HANDLERS[command.kind];
      if (!handler) throw new CommandError(`Comando no soportado: ${command.kind}`);
      handler(store, command as Command);
    }
  } catch (error) {
    store.replaceAll(snapshot);
    store.clearChanges();
    throw error;
  }
  return store.changes();
}
