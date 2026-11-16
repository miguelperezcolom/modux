import { describe, expect, it } from 'vitest';
import { hasConnectHandles } from '../connect-handles.js';
import { RENAMEABLE_KINDS } from '../renameable.js';
import { RENAMEABLE } from '../store/commands/rename.js';

describe('a notification on the map', () => {
  // The palette's notice says «drag an event to it, and from it to the roles it notifies»: the
  // second half needs a handle on the notification (an actor never starts a relation).
  it('offers the connect handles, nested or free', () => {
    expect(hasConnectHandles('notification', false)).toBe(true);
    expect(hasConnectHandles('notification', true)).toBe(true);
    expect(hasConnectHandles('actor', false)).toBe(true);
    expect(hasConnectHandles('menu-group', false)).toBe(false);
  });

  it('can be renamed with F2', () => {
    expect(RENAMEABLE_KINDS.has('notification')).toBe(true);
  });
});

describe('what F2 renames', () => {
  it('is something the IDE store knows how to rename', () => {
    for (const kind of RENAMEABLE_KINDS) expect(RENAMEABLE, kind).toContain(kind);
  });
});
