import test from 'node:test';
import assert from 'node:assert/strict';
import { data } from '../../public/js/data.js';
import { createStore } from '../../public/js/store.js';
import { installOwnershipSync, installLoadoutSync } from '../../public/js/ui/loadoutSync.js';
import { roomProfile } from '../../server/mods.js';
import { checkNotOwned } from '../../shared/protocol.js';

test('unchanged ownership is resent when the profile changes, even before gameplay files were loaded', async () => {
  const id = 'chess_char_3_01_a', requests = [], scheduled = new Map();
  let stored = [], seq = 0;
  const timers = { setTimeout(fn) { const n = ++seq; scheduled.set(n, fn); return n; }, clearTimeout(n) { scheduled.delete(n); } };
  const net = { status: 'online', on() { return () => {}; }, async request(t, body) {
    requests.push({ t, ...body });
    stored = checkNotOwned(body.notOwned, (key) => roomProfile(body.mods || []).data.chess[key]).notOwned;
    return { t: 'ok' };
  } };
  const target = createStore({ notOwned: [id], ownSync: 'idle' });
  await data.setProfile([]);
  const sync = installOwnershipSync({ net, target, timers });
  try {
    await sync.flush(); assert.deepEqual(stored, [id]);
    await data.setProfile(['marisa']);
    assert.ok(scheduled.size > 0, 'profile selection schedules a sync without an ownership edit');
    await sync.flush(); assert.deepEqual(stored, [id]);
    await data.setProfile([]);
    await sync.flush(); assert.deepEqual(stored, [id]);
    assert.equal(requests.length, 3);
    assert.deepEqual(requests[1].mods, ['marisa']);
  } finally { sync.dispose(); await data.setProfile([]); }
});

test('a saved added-operator skill is sent when joining the mod profile without editing the loadout', async () => {
  const id = 'chess_char_4217_makoto_a', requests = [], scheduled = new Map();
  let n = 0;
  const timers = { setTimeout(fn) { const id = ++n; scheduled.set(id, fn); return id; }, clearTimeout(id) { scheduled.delete(id); } };
  const net = { status: 'online', on() { return () => {}; }, async request(t, body) { requests.push({ t, ...body }); return { t: 'ok' }; } };
  const target = createStore({ entries: { [id]: { skill: 2 } }, ops: {}, sync: 'idle' });
  await data.setProfile([]);
  const chess = () => roomProfile(data.profileMods()).data.chess;
  const sync = installLoadoutSync({ net, target, timers, getChessReady: async () => chess(), lookupChess: (id) => chess()[id] });
  try {
    await sync.flush(); assert.deepEqual(requests.at(-1).entries, {});
    await data.setProfile(['marisa']);
    assert.ok(scheduled.size > 0);
    await sync.flush();
    assert.equal(requests.at(-1).entries[id].skill, 2);
    assert.deepEqual(requests.at(-1).mods, ['marisa']);
  } finally { sync.dispose(); await data.setProfile([]); }
});
