/**
 * The read side: query services, projections and the read models they feed, plus the scheduled
 * triggers that drive work with no one asking.
 *
 * A projection is the one command here that is not a thin write. It needs a source and a
 * destination, and the destination is usually a read model that does not exist yet — so it is
 * created along the way, which is what «the model is complete from birth» means for this corner.
 * Ported from `EditorApiController`.
 */

import { nested, type Element, type ModelStore } from '../store.js';
import { add, CommandError, type Handler, remove } from '../spec.js';
import { t } from '../../i18n/index.js';

export const READSIDE_COMMANDS: Record<string, Handler> = {
  'add-query-service': add({
    type: 'queryServices',
    parent: { type: 'boundedContexts', from: 'boundedContextId' },
    init: (c) => ({ boundedContextId: c.boundedContextId, operations: [] }),
  }),

  'remove-query-service': (store, command) => {
    const id = String(command.id);
    const consumed = store.all('useCases').some((uc) =>
      nested(uc.steps).some((step) => step.queryServiceId === id));
    if (consumed) {
      throw new CommandError(t('store.readside.removeQueryServiceConsumed', { id }));
    }
    store.removeFromAllLists('roles', 'allowedQueryServiceIds', id);
    store.removeFromAllLists('aiAgents', 'allowedQueryServiceIds', id);
    store.remove('queryServices', id);
  },

  /**
   * A projection reads one source and writes one read model.
   *
   * Exactly one source: an aggregate's own state, an external operation to poll, or a legacy
   * table. Naming none is the mistake worth catching — the projection would generate nothing and
   * say nothing about why.
   */
  'add-projection': (store, command) => {
    const id = String(command.id);
    if (store.has('projections', id)) return;
    const aggregate = resolveSource(store, command);

    let readModelId: string;
    let owner: Element;
    const target = command.targetId as string | undefined;
    if (target && store.has('readModels', target)) {
      readModelId = target;
      // Prefer the context that LISTS it; fall back to the read model's own boundedContextId (a read
      // model adopted from a loose drop may carry the field without being in the list yet). Self-heal.
      let holder = store.findByListMember('boundedContexts', 'readModelIds', target);
      if (!holder) {
        const bc = store.get('readModels', target)?.boundedContextId;
        holder = bc ? store.get('boundedContexts', String(bc)) : undefined;
        if (holder) store.addToList('boundedContexts', holder.id, 'readModelIds', target);
      }
      if (!holder) {
        throw new CommandError(
          t('store.readside.readModelWithoutContext', { id: target }));
      }
      owner = holder;
    } else {
      const context = store.get('boundedContexts', String(command.boundedContextId));
      if (!context) {
        throw new CommandError(t('store.unknown.boundedContext', { id: command.boundedContextId }));
      }
      owner = context;
      readModelId = `rm-${id.replace(/^proj-/, '')}`;
      if (!store.has('readModels', readModelId)) {
        store.put('readModels', {
          id: readModelId,
          name: command.readModelName
            ?? (aggregate ? `${aggregate.name}View` : command.name),
          boundedContextId: owner.id,
          modelId: aggregate?.modelId ?? null,
          aggregateId: aggregate?.id ?? null,
        });
        store.addToList('boundedContexts', owner.id, 'readModelIds', readModelId);
      }
    }

    store.put('projections', {
      id,
      name: command.name,
      readModelId,
      mappings: [],
      // the names the model (ProjectionEntity, the schema) gives them — the server reads these
      sourceAggregateId: aggregate?.id ?? null,
      sourceExternalUseCaseId: command.externalUseCaseId ?? null,
      sourceExternalTableId: command.externalTableId ?? null,
    });
    store.addToList('boundedContexts', owner.id, 'projectionIds', id);
  },

  'remove-projection': (store, command) => {
    const id = String(command.id);
    const updated = store.all('subscriptions').some((s) =>
      nested(s.actions).some((action) => action.projectionId === id));
    if (updated) {
      throw new CommandError(t('store.readside.removeProjectionUpdated', { id }));
    }
    store.removeFromAllLists('boundedContexts', 'projectionIds', id);
    store.remove('projections', id);
  },

  // ---- scheduled triggers --------------------------------------------------

  'add-scheduled-trigger': add({
    type: 'scheduledTriggers',
    // may be born free-standing (dropped on a canvas) and nested into a context afterwards
    parent: { type: 'boundedContexts', from: 'boundedContextId', list: 'scheduledTriggerIds', required: false },
    init: (c) => ({
      // daily at midnight — a schedule you have to mean to keep, not one that fires every minute.
      // Six fields (seconds first): the generated @Scheduled is Spring's cron, not crontab's.
      cronExpression: c.cronExpression ?? '0 0 0 * * *',
      // the stored field is useCaseId (the schema's and the generator's); the command says targetUseCaseId
      useCaseId: c.targetUseCaseId ?? null,
    }),
  }),

  'remove-scheduled-trigger': remove({
    type: 'scheduledTriggers',
    parent: { type: 'boundedContexts', from: 'boundedContextId', list: 'scheduledTriggerIds' },
  }),

  'set-scheduled-trigger-target': (store, command) => {
    const id = String(command.id);
    if (!store.has('scheduledTriggers', id)) {
      throw new CommandError(t('store.unknown.trigger', { id: id }));
    }
    const target = command.targetUseCaseId as string | undefined;
    if (target && !store.has('useCases', target)) {
      throw new CommandError(t('store.unknown.useCase', { id: target }));
    }
    store.patch('scheduledTriggers', id, { useCaseId: target ?? null });
  },

  /** When the trigger fires: a Spring cron (six fields, seconds first). */
  'set-scheduled-trigger-cron': (store, command) => {
    const id = String(command.id);
    if (!store.has('scheduledTriggers', id)) throw new CommandError(t('store.unknown.trigger', { id: id }));
    const cron = String(command.cronExpression ?? '').trim();
    if (cron.split(/\s+/).length !== 6) {
      throw new CommandError(t('store.readside.invalidCron', { cron }));
    }
    store.patch('scheduledTriggers', id, { cronExpression: cron });
  },
};

/** The aggregate a projection reads, when that is its source. Raises when no source is named. */
function resolveSource(store: ModelStore, command: Record<string, any>): Element | undefined {
  if (command.aggregateId) {
    const aggregate = store.get('aggregates', String(command.aggregateId));
    if (!aggregate) throw new CommandError(t('store.unknown.aggregate', { id: command.aggregateId }));
    return aggregate;
  }
  if (command.externalUseCaseId) {
    const known = store.all('externalSystems')
      .some((x) => nested(x.useCases).some((u) => u.id === command.externalUseCaseId));
    if (!known) {
      throw new CommandError(t('store.unknown.externalOperation', { id: command.externalUseCaseId }));
    }
    return undefined;
  }
  if (command.externalTableId) {
    // The table may still be LOOSE (dropped, not yet adopted into an external system): accept it —
    // its id survives adoption, so the projection stays valid once the table finds its home.
    const known = store.all('externalSystems')
      .some((x) => nested(x.tables).some((t) => t.id === command.externalTableId))
      || store.all('looseElements')
        .some((e) => e.id === command.externalTableId && e.elementType === 'external-table');
    if (!known) throw new CommandError(t('store.unknown.externalTable', { id: command.externalTableId }));
    return undefined;
  }
  throw new CommandError(t('store.readside.projectionNeedsSource'));
}

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const READSIDE_TYPES: string[] = [
  'queryServices', 'projections', 'readModels', 'scheduledTriggers',
];
