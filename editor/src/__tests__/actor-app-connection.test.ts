import { describe, expect, it } from 'vitest';
import { connectionOptions, type GestureHost } from '../gestures.js';
import type { ModuxModel } from '../model.js';

// An actor and a UI app must be connectable from the unified canvas (the one the IntelliJ plugin
// hosts): it resolves every trace through connectionOptions, and add-actor-app used to be reachable
// only from the classic UI lens.
function host(model: Partial<ModuxModel>): { host: GestureHost; sent: unknown[] } {
  const sent: unknown[] = [];
  const full = { boundedContexts: [], externalSystems: [], ...model } as unknown as ModuxModel;
  return { sent, host: { model: full, command: (c: unknown) => sent.push(c) } as unknown as GestureHost };
}

const model = {
  actors: [{ id: 'actor-1', name: 'Bibliotecario' }],
  uiApps: [{ id: 'app-1', name: 'Mostrador' }],
} as unknown as Partial<ModuxModel>;

describe('actor ⇆ UI app', () => {
  for (const [from, to] of [['actor-1', 'app-1'], ['app-1', 'actor-1']]) {
    it(`offers the actor-app relation from ${from} to ${to}`, () => {
      const { host: h, sent } = host(model);
      const opts = connectionOptions(h, from, to);
      expect(opts.map((o) => o.id)).toEqual(['actor-app']);
      opts[0].apply();
      expect(sent).toEqual([{ kind: 'add-actor-app', actorId: 'actor-1', appId: 'app-1' }]);
    });
  }

  it('does not duplicate an existing use', () => {
    const { host: h, sent } = host({ ...model, actorAppUses: [{ actorId: 'actor-1', appId: 'app-1' }] });
    connectionOptions(h, 'actor-1', 'app-1')[0].apply();
    expect(sent).toEqual([]);
  });
});
