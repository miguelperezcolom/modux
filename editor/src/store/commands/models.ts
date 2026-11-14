/**
 * Data models: their fields, the mappings between them, and the transformations that produce one
 * from others.
 *
 * A model is the shape data has at some point — a viewmodel, an API payload, an aggregate's
 * state. Its fields are nested, so every edit here rewrites one list inside one element.
 *
 * Ported from `UiEditorCommands`.
 */

import { nested, type Element, type ModelStore } from '../store.js';
import { add, CommandError, type Handler } from '../spec.js';
import { t, type MessageKey } from '../../i18n/index.js';

/** How a field says what it is. Exactly one of these references is kept; the rest are cleared. */
const TYPE_REFS: Record<string, string> = {
  'value-object': 'valueObjectId',
  'entity': 'entityId',
  'model': 'modelId',
  'enum': 'enumId',
};

/** The validations that all mean «this field is mandatory». */
const REQUIRED_VALIDATIONS = ['NotNull', 'NotEmpty', 'NotBlank'];

export const MODEL_COMMANDS: Record<string, Handler> = {
  'add-model': add({ type: 'models', init: () => ({ fields: [], validations: [] }) }),

  /** The model goes, and whoever used it as a viewmodel stops claiming to. */
  'remove-model': (store, command) => {
    const id = String(command.id);
    for (const page of store.all('pages')) {
      const patch: Record<string, unknown> = {};
      if (page.modelId === id) patch.modelId = null;
      const content = clearComponentField(nested(page.content) as Element[], 'modelId', id);
      if (content) patch.content = content;
      if (Object.keys(patch).length) store.patch('pages', page.id, patch);
    }
    for (const app of store.all('uiAdapters')) {
      if (app.modelId === id) store.patch('uiAdapters', app.id, { modelId: null });
    }
    store.remove('models', id);
  },

  'add-model-field': (store, command) => {
    const model = mustGet(store, 'models', command.modelId, 'store.kind.model');
    const fields = nested(model.fields);
    const fieldId = String(command.fieldId);
    if (fields.some((f) => f.id === fieldId)) return;
    store.patch('models', model.id, {
      fields: [...fields, {
        id: fieldId,
        name: command.name,
        basicType: true,
        type: command.type ?? 'string',
        validations: [],
      }],
    });
  },

  /** The field goes, and so do the mapping rules that mapped it — they no longer apply. */
  'remove-model-field': (store, command) => {
    const model = mustGet(store, 'models', command.modelId, 'store.kind.model');
    const fieldId = String(command.fieldId);
    store.patch('models', model.id, {
      fields: nested(model.fields).filter((f) => f.id !== fieldId),
    });
    pruneMappingRules(store, model.id, fieldId);
  },

  /**
   * Points a field at a TYPE: a value object (which brings invariants), an entity, another
   * model, an enum, or a basic type. Exactly one reference survives — a field that claimed to be
   * two things at once would generate whichever the template looked at first.
   */
  'set-model-field-type': (store, command) => {
    patchField(store, command, (field) => {
      const kind = String(command.type ?? 'primitive');
      const ref = TYPE_REFS[kind];
      const cleared = { valueObjectId: null, entityId: null, modelId: null, enumId: null };
      if (!ref) {
        return {
          ...cleared,
          basicType: true,
          isEnum: false,
          type: command.targetId ? command.targetId : (field.type ?? 'string'),
        };
      }
      return {
        ...cleared,
        basicType: false,
        isEnum: kind === 'enum',
        [ref]: command.targetId ?? null,
      };
    });
  },

  /** Mandatory is not a flag on the field: it is a validation, so that is what gets toggled. */
  'set-model-field-required': (store, command) => {
    patchField(store, command, (field) => {
      const validations = nested(field.validations);
      const has = validations.some((v) => REQUIRED_VALIDATIONS.includes(String(v.type)));
      if (command.required === true) {
        return has ? {} : {
          validations: [...validations, { id: `${field.id}-required`, type: 'NotNull' }],
        };
      }
      return has
        ? { validations: validations.filter((v) => !REQUIRED_VALIDATIONS.includes(String(v.type))) }
        : {};
    });
  },

  'set-model-field-collection': (store, command) => {
    patchField(store, command, () => ({ collection: command.collection === true }));
  },

  /**
   * Renames the field and, optionally, retypes its BASIC type. The type REFERENCE (value object,
   * entity, model, enum), the multiplicity and the metadata are left alone — those move through
   * their own commands, and clearing them here would silently undo them.
   */
  'set-model-field': (store, command) => {
    patchField(store, command, (field) => ({
      name: blank(command.name) ? field.name : command.name,
      type: blank(command.type) ? field.type : command.type,
    }));
  },

  /** Moves a field to another model; the rules that mapped it there no longer apply and drop. */
  'move-model-field': (store, command) => {
    const source = mustGet(store, 'models', command.modelId, 'store.kind.model');
    const target = mustGet(store, 'models', command.targetId, 'store.kind.model');
    const fieldId = String(command.fieldId);
    const moving = nested(source.fields).find((f) => f.id === fieldId);
    if (!moving) throw new CommandError(t('store.unknown.field', { id: fieldId }));
    if (nested(target.fields).some((f) => f.id === fieldId)) {
      throw new CommandError(t('store.model.targetHasField', { id: fieldId }));
    }
    store.patch('models', source.id, {
      fields: nested(source.fields).filter((f) => f.id !== fieldId),
    });
    store.patch('models', target.id, {
      fields: [...nested(store.get('models', target.id)!.fields), moving],
    });
    pruneMappingRules(store, source.id, fieldId);
  },

  // ---- mappings ------------------------------------------------------------

  'add-model-mapping': (store, command) => {
    const id = String(command.id);
    if (store.has('modelMappings', id)) return;
    mustGet(store, 'models', command.sourceId, 'store.kind.model');
    mustGet(store, 'models', command.targetId, 'store.kind.model');
    store.put('modelMappings', {
      id,
      name: command.name,
      sourceModelId: command.sourceId,
      targetModelId: command.targetId,
      rules: [],
    });
  },

  'remove-model-mapping': (store, command) => {
    store.remove('modelMappings', String(command.id));
  },

  'add-model-mapping-rule': (store, command) => {
    const mapping = mustGet(store, 'modelMappings', command.id, 'store.kind.mapping');
    const rules = nested(mapping.rules);
    const already = rules.some((r) =>
      r.sourceFieldId === command.sourceId && r.targetFieldId === command.targetId);
    if (already) return;
    store.patch('modelMappings', mapping.id, {
      rules: [...rules, {
        id: freeRuleId(rules),
        sourceFieldId: command.sourceId,
        targetFieldId: command.targetId,
      }],
    });
  },

  'remove-model-mapping-rule': (store, command) => {
    const mapping = mustGet(store, 'modelMappings', command.id, 'store.kind.mapping');
    store.patch('modelMappings', mapping.id, {
      rules: nested(mapping.rules).filter((r) => r.id !== command.itemId),
    });
  },

  // ---- transformations -----------------------------------------------------

  'add-transformation': add({ type: 'transformations', init: () => ({ inputs: [] }) }),

  'remove-transformation': (store, command) => {
    store.remove('transformations', String(command.id));
  },

  'add-transformation-input': (store, command) => {
    const transformation = mustGet(store, 'transformations', command.id, 'store.kind.transformation');
    const ref = modelRef(store, command);
    const inputs = nested(transformation.inputs);
    if (inputs.some((i) => sameRef(i, ref))) return;
    store.patch('transformations', transformation.id, { inputs: [...inputs, ref] });
  },

  'remove-transformation-input': (store, command) => {
    const transformation = mustGet(store, 'transformations', command.id, 'store.kind.transformation');
    const fieldId = blank(command.fieldId) ? null : command.fieldId;
    store.patch('transformations', transformation.id, {
      inputs: nested(transformation.inputs).filter((i) =>
        !(i.modelId === command.modelId && (i.fieldId ?? null) === fieldId)),
    });
  },

  /** What the transformation produces — a model, or one field of it. No model just unwires. */
  'set-transformation-output': (store, command) => {
    const transformation = mustGet(store, 'transformations', command.id, 'store.kind.transformation');
    store.patch('transformations', transformation.id, {
      output: blank(command.modelId) ? null : modelRef(store, command),
    });
  },
};

/** Apply a patch to one field of one model. Every field command is this plus its own patch. */
function patchField(
  store: ModelStore,
  command: Record<string, any>,
  patch: (field: Element) => Record<string, unknown>,
): void {
  const model = mustGet(store, 'models', command.modelId, 'store.kind.model');
  const fieldId = String(command.fieldId);
  store.patch('models', model.id, {
    fields: nested(model.fields).map((f) =>
      (f.id === fieldId ? { ...f, ...patch(f as Element) } : f)),
  });
}

/** A reference to a model, or to one of its fields. The model has to exist; the field is free. */
function modelRef(store: ModelStore, command: Record<string, any>): Element {
  mustGet(store, 'models', command.modelId, 'store.kind.model');
  return {
    id: String(command.modelId),
    modelId: command.modelId,
    fieldId: blank(command.fieldId) ? null : command.fieldId,
  };
}

const sameRef = (a: Element, b: Element) =>
  a.modelId === b.modelId && (a.fieldId ?? null) === (b.fieldId ?? null);

/** Drops every rule of the model's mappings that mentions the field. */
function pruneMappingRules(store: ModelStore, modelId: string, fieldId: string): void {
  for (const mapping of store.all('modelMappings')) {
    if (mapping.sourceModelId !== modelId && mapping.targetModelId !== modelId) continue;
    const rules = nested(mapping.rules);
    const kept = rules.filter((r) => r.sourceFieldId !== fieldId && r.targetFieldId !== fieldId);
    if (kept.length !== rules.length) store.patch('modelMappings', mapping.id, { rules: kept });
  }
}

/** The first `mr-N` no rule is using. Rules are identified positionally by the editor. */
function freeRuleId(rules: Element[]): string {
  const taken = new Set(rules.map((r) => String(r.id)));
  for (let n = rules.length + 1; ; n++) {
    if (!taken.has(`mr-${n}`)) return `mr-${n}`;
  }
}

/**
 * A page's content tree with every node's `field` reference to `id` cleared, or undefined when
 * there was nothing to clear — so a caller can skip writing the page.
 */
export function clearComponentField(
  content: Element[], field: string, id: string,
): Element[] | undefined {
  let touched = false;
  const walk = (nodes: Element[]): Element[] => nodes.map((node) => {
    const children = nested(node.children) as Element[];
    const hit = node[field] === id;
    if (hit) touched = true;
    const rewritten: Element = children.length
      ? { ...node, children: walk(children) } : { ...node };
    if (hit) rewritten[field] = null;
    return rewritten;
  });
  const result = walk(content);
  return touched ? result : undefined;
}

export function mustGet(
  store: ModelStore, type: string, id: unknown, label: MessageKey,
): Element {
  const element = store.get(type, String(id));
  if (!element) throw new CommandError(t('store.error.unknownKind', { kind: t(label), id: String(id) }));
  return element;
}

export const blank = (value: unknown) =>
  value == null || (typeof value === 'string' && !value.trim());

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const MODEL_TYPES: string[] = ['models', 'modelMappings', 'transformations'];
