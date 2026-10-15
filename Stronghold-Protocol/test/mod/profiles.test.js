import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomProfile } from '../../server/mods.js';
import { getData } from '../../server/data.js';
import { contentHash, validMods } from '../../shared/mods.js';
import { DataSource } from '../../server/sim/simdata.js';
import { makeBattle, enemyRec, checkInvariants } from '../helpers/battleHarness.js';
import { rhodeEffOf as battleEff, rhodeHealMul, rhodeAuraInterval } from '../../server/sim/content/bonds/addon/battle.js';
import { rhodeEffOf as prepEff } from '../../server/match/rhodeMeta.js';
import { parseDevFunds, devFundsOn, applyDevFunds } from '../../server/match/devMode.js';
import { createDataStore } from '../../public/js/data.js';
import { availableSkins, materializeAssets, parseStoredSkins } from '../../public/js/ui/skinModel.js';
import { startServer } from '../../server/index.js';
import { TestClient } from '../helpers/wsClient.js';
import { loadoutRecord, resolveRecordLoadout } from '../../shared/loadoutRecord.js';

const original = roomProfile([], getData());
const mod = roomProfile(['marisa'], getData());
const MAKOTO = 'chess_char_4217_makoto_a';
const source = (p, extra = {}) => new DataSource({ ...p.data, ...extra }, null);

test('profiles preserve the original roster, include every mod addition, and have stable distinct identities', () => {
  assert.ok(!original.data.chess[MAKOTO]);
  assert.ok(mod.data.chess[MAKOTO]);
  assert.deepEqual([Object.keys(original.data.chess).length, Object.keys(mod.data.chess).length], [266, 274]);
  assert.deepEqual([Object.keys(mod.data.bonds).length, Object.keys(mod.data.bands).length], [24, 41]);
  assert.equal(mod.contentHash, contentHash(mod.data));
  assert.notEqual(original.contentHash, mod.contentHash);
  assert.ok(!validMods(['marisa', 'marisa']) && !validMods(['../x']));
  assert.throws(() => roomProfile(['unknown']), /unknown/);
  for (const id of ['char_4217_makoto', 'char_1015_aglna2', 'char_1052_kalts2', 'char_1037_amiya3']) {
    assert.ok(!mod.data.backups.diy.ownedPool.includes(id));
  }
});

test('all four shop kits and their selectable skills deploy and run without content errors', () => {
  for (const c of Object.values(mod.data.chess).filter((c) => /chess_char_(4217|1015|1052|1037)_/.test(c.chessId))) {
    for (const skill of c.skills) {
      const h = makeBattle({ data: source(mod), units: [{ chessId: c.chessId, skillIndex: skill.index, row: 10, col: 4 }], timeLimit: 10 });
      h.step();
      const u = h.allies().find((u) => u.kind === 'op');
      assert.ok(u && !u.kit.generic, `${c.chessId} S${skill.index + 1}: faithful kit`);
      u.skill.gainSp(999);
      h.run(5);
      checkInvariants(h.b);
      assert.deepEqual(h.b.errors, [], `${c.chessId} S${skill.index + 1}`);
    }
  }
});

test('Makoto survives a fatal hit as a nonblocking mask, then returns to his body', () => {
  for (const suffix of ['a', 'b']) {
    const h = makeBattle({ data: source(mod), units: [{ uid: 1, chessId: `chess_char_4217_makoto_${suffix}`, skillIndex: 1, row: 10, col: 4 }], timeLimit: 60 });
    h.step(); const u = h.unit(1);
    h.b.loseHp(u, 1e9);
    assert.ok(u.alive && u.findBuff('trait:substitute'));
    assert.equal(u.s.blockCnt, 0);
    h.run(21);
    assert.ok(u.alive && !u.findBuff('trait:substitute'));
    assert.equal(u.s.blockCnt, 2); assert.deepEqual(h.b.errors, []);
  }
});

test('prep and battle Rhodes Island curves agree, cap intervals, and do not recursively heal/damage forever', () => {
  const bb = mod.data.bonds.rhodeShip.bb;
  for (const count of [0, 1, 3, 4, 8]) assert.equal(prepEff(bb, count), battleEff(bb, count));
  assert.equal(battleEff(bb, 3), 0.5); assert.equal(battleEff(bb, 4), 1);
  assert.equal(rhodeHealMul(bb, 10), 1.02);
  assert.equal(rhodeAuraInterval(bb, 999), rhodeAuraInterval(bb, 100));
  const h = makeBattle({ data: source(mod), units: [
    { uid: 1, chessId: 'chess_char_1052_kalts2_a', row: 10, col: 4 },
    { uid: 2, chessId: 'chess_char_1037_amiya3_a', row: 11, col: 4 },
    { uid: 3, chessId: 'chess_char_4_26_a', row: 10, col: 5 },
    { uid: 4, chessId: 'chess_char_5_04_a', row: 11, col: 5 },
  ], bonds: { rhodeShip: { count: 4, tier: 4, layers: 100 } }, timeLimit: 15 });
  h.run(12); checkInvariants(h.b); assert.deepEqual(h.b.errors, []);
  for (const u of h.allies()) assert.ok(Number.isFinite(u.s.atk));
});

test('Kun counts lethal devours only, revives the three victims once and enables air attacks', () => {
  const h = makeBattle({ data: source(mod), bandId: 'band_kun', timeLimit: 30, units: [
    { uid: 1, chessId: 'chess_char_1_02_a', row: 10, col: 4 },
    { uid: 2, chessId: 'chess_char_1_08_a', row: 11, col: 4 },
    { uid: 3, chessId: 'chess_char_2_14_a', row: 10, col: 5 },
    { uid: 4, chessId: 'chess_char_2_01_a', row: 11, col: 5 },
  ] });
  h.step(); const by = h.unit(1);
  h.b.loseHp(h.unit(2), 1, { source: by, tags: ['bond:egir:devour'] });
  assert.ok(!by.s.flags.liftoff);
  for (const uid of [2, 3, 4]) h.b.loseHp(h.unit(uid), 1e9, { source: by, tags: ['bond:egir:devour'] });
  assert.ok(by.s.flags.liftoff && by.s.flags.blockFly && by.profile.canHitFly);
  for (const uid of [2, 3, 4]) assert.ok(h.unit(uid).alive);
  h.b.loseHp(h.unit(2), 1e9, { source: by, tags: ['bond:egir:devour'] });
  assert.ok(!h.unit(2).alive); assert.deepEqual(h.b.errors, []);
});

test('interleaving original and mod battles keeps content isolated and deterministic', () => {
  const run = () => {
    const args = { timeLimit: 6, enemies: [{ key: 'dummy', pos: [10, 5] }], units: [{ chessId: MAKOTO, row: 10, col: 4 }] };
    const extra = { enemies: { dummy: enemyRec({ key: 'dummy', hp: 1e6, speed: 0 }) } };
    const a = makeBattle({ ...args, data: source(mod, extra) });
    const b = makeBattle({ ...args, units: [{ chessId: 'chess_char_1_08_a', row: 10, col: 4 }], data: source(original, extra) });
    for (let i = 0; i < 180; i++) { a.step(); b.step(); }
    assert.deepEqual(a.b.errors, []); assert.deepEqual(b.b.errors, []);
    return [a.result(), b.result()];
  };
  assert.deepEqual(run(), run());
});

test('profile switching discards stale data even when a previous fetch resolves late', async () => {
  let resolveOld;
  const urls = [];
  const data = createDataStore({ retryDelays: [], fetch: async (url) => {
    urls.push(url);
    if (url === '/data/chess.json') return new Promise((resolve) => { resolveOld = resolve; });
    return { ok: true, json: async () => mod.data.chess };
  } });
  const old = data.load('chess');
  await data.setProfile(['marisa']);
  resolveOld({ ok: true, json: async () => original.data.chess }); await old;
  assert.ok(data.lookup('chess', MAKOTO));
  assert.deepEqual(urls, ['/data/chess.json', '/data/mods/marisa/chess.json']);
});

test('skins use hashed manifest URLs without mutating shared art and fall back when missing', () => {
  const id = 'char_4217_makoto', skin = 'char_4217_makoto@p3r#1';
  const art = { chars: { [id]: { portrait: '/assets/default.png', spine: {} } }, skins: { [skin]: { portrait: '/assets/~1234567890abcdef/skin.png' } } };
  const entries = parseStoredSkins({ v: 1, entries: { [id]: skin } });
  assert.equal(availableSkins(art, mod.data.skins, id).length, 1);
  assert.equal(materializeAssets(art, mod.data.skins, entries).chars[id].portrait, art.skins[skin].portrait);
  assert.equal(art.chars[id].portrait, '/assets/default.png');
  assert.deepEqual(availableSkins({ chars: art.chars }, mod.data.skins, id), []);
});

test('test funds require an enabled mod in a solo room and never credit bots', () => {
  assert.equal(parseDevFunds('bad'), 0);
  assert.ok(devFundsOn({ isSolo: true, mods: ['marisa'] }, { funds: 9999 }));
  assert.ok(!devFundsOn({ isSolo: false, mods: ['marisa'] }, { funds: 9999 }));
  assert.ok(!devFundsOn({ isSolo: true, mods: [] }, { funds: 9999 }));
  assert.equal(applyDevFunds({ funds: 9999 }, { funds: 10 }, 4), 9985);
  assert.equal(applyDevFunds({ funds: 9999 }, { funds: 10, isBot: true }, 4), 0);
});

test('room manager switches preserve an existing operator\'s selected equipment module and its effects', async () => {
  const server = await startServer({ port: 0, host: '127.0.0.1', log: { info() {}, warn() {}, error() {} } });
  let client;
  const chessId = 'chess_char_3_01_a';
  const goldenId = 'chess_char_3_01_b';
  const charId = 'char_103_angel';
  const moduleId = 'uniequip_003_angel';
  const effectsOf = (rec) => ({ module: rec.module, stats: rec.stats, trait: rec.trait, talents: rec.talents });
  try {
    client = await TestClient.connect(`ws://127.0.0.1:${server.port}/ws`);
    const welcome = await client.hello('Equipment');
    const originalRecord = original.data.chess[goldenId];
    const expected = loadoutRecord(originalRecord, resolveRecordLoadout(originalRecord, { module: moduleId }));
    assert.equal(expected.module.id, moduleId);
    assert.equal(expected.module.active, true);
    assert.notDeepEqual(expected.stats, original.data.chess[goldenId].stats, 'the alternate equipped module changes combat stats');
    const configurations = [
      { mods: [] },
      { mods: ['marisa'] },
      { mods: ['marisa'], modOptions: { existing: { vanillaChars: [charId] }, bonds: { enabled: false }, strategies: { enabled: false } } },
    ];
    for (const [index, configuration] of configurations.entries()) {
      client.clearInbox();
      assert.equal((await client.request({ t: 'room.create', mode: 'solo', difficulty: 'NORMAL', ...configuration })).t, 'ok');
      const state = await client.waitFor('room.state');
      const room = server.lobby.rooms.get(state.code);
      const session = server.registry.byId(welcome.playerId);
      if (index > 0) {
        assert.equal(session.loadout[chessId].module, moduleId, 'changing room manager settings preserves the session selection');
        assert.equal(room.seatOf(welcome.playerId).loadout[chessId].module, moduleId, 'changing the room manager preserves the session selection');
      }
      assert.equal((await client.request({ t: 'room.loadout', entries: { [chessId]: { module: moduleId } } })).t, 'ok');
      const selected = room.seatOf(welcome.playerId).loadout[chessId];
      assert.equal(selected.module, moduleId);
      assert.deepEqual(session.loadout[chessId], selected);
      const record = room.data.chess[goldenId];
      const resolved = loadoutRecord(record, resolveRecordLoadout(record, selected));
      assert.deepEqual(effectsOf(resolved), effectsOf(expected), 'the same equipped module retains its stats, trait and talent effects');
      assert.equal((await client.request({ t: 'room.leave' })).t, 'ok');
    }
  } finally { await client?.terminate(); await server.close(); }
});

test('real server freezes full and customized manager settings for players and spectators', async () => {
  const server = await startServer({ port: 0, host: '127.0.0.1', log: { info() {}, warn() {}, error() {} } });
  const clients = [];
  const welcomes = [];
  try {
    for (const name of ['Mod', 'Base', 'Guest', 'Custom', 'Follower']) {
      const c = await TestClient.connect(`ws://127.0.0.1:${server.port}/ws`); welcomes.push(await c.hello(name)); clients.push(c);
    }
    const [host, vanilla, guest, custom, follower] = clients;
    assert.equal((await host.request({ t: 'room.create', mode: 'coop', difficulty: 'NORMAL', mods: ['marisa'] })).t, 'ok');
    const state = await host.waitFor('room.state');
    assert.equal(state.contentHash, mod.contentHash);
    assert.deepEqual(state.modOptions, {
      existing: { enabled: true, vanillaChars: [] },
      additions: { enabled: true, disabledChars: [], diyChars: [] },
      bonds: { enabled: true, disabledIds: [], memberOverrides: {} }, existingBondMembers: { disabledIds: [] },
      strategies: { enabled: true, disabledIds: [] },
    }, 'an older client receives complete MOD defaults');
    assert.equal((await vanilla.request({ t: 'room.create', mode: 'solo', difficulty: 'NORMAL' })).t, 'ok');
    const pure = await vanilla.waitFor('room.state'); assert.deepEqual(pure.mods, []);
    assert.equal((await guest.request({ t: 'room.join', code: state.code })).t, 'ok');
    const joined = await guest.waitFor('room.state'); assert.deepEqual(joined.mods, ['marisa']);
    assert.equal(joined.contentHash, state.contentHash);
    const pref = { t: 'room.loadout', entries: { [MAKOTO]: { skill: 0 } }, mods: ['marisa'] };
    assert.equal((await guest.request(pref)).t, 'ok');
    assert.equal((await vanilla.request(pref)).t, 'error');
    assert.equal((await vanilla.request({ t: 'room.create', mode: 'solo', difficulty: 'NORMAL', mods: ['unknown'] })).t, 'error');
    assert.ok(!server.lobby.rooms.get(pure.code).data.chess[MAKOTO]);
    assert.ok(server.lobby.rooms.get(state.code).data.chess[MAKOTO]);

    const modOptions = {
      existing: { enabled: true, vanillaChars: ['char_171_bldsk'] },
      additions: { enabled: true, disabledChars: ['char_1037_amiya3'], diyChars: ['char_4217_makoto'] },
      bonds: { enabled: true, disabledIds: ['rhodeShip'], memberOverrides: { 'rhodeShip:char_003_kalts': false } },
      existingBondMembers: { disabledIds: ['indomShip:char_4217_makoto'] },
      strategies: { enabled: false, disabledIds: [] },
    };
    assert.equal((await custom.request({ t: 'room.create', mode: 'coop', difficulty: 'NORMAL', mods: ['marisa'], modOptions })).t, 'ok');
    const customState = await custom.waitFor('room.state');
    const customRoom = server.lobby.rooms.get(customState.code);
    assert.deepEqual(customState.modOptions, modOptions);
    assert.notEqual(customState.contentHash, state.contentHash);
    assert.deepEqual(customRoom.data.chess.chess_char_4_26_a.bonds, mod.data.chess.chess_char_4_26_a.bonds.filter((id) => id !== 'rhodeShip'));
    assert.equal(customRoom.data.chess.chess_char_4217_makoto_a.visible, false);
    assert.deepEqual(customRoom.data.chess.chess_char_4217_makoto_a.bonds, ['lateranoShip', 'preciShip']);
    assert.equal(Object.values(customRoom.data.chess).some((c) => c.charId === 'char_1037_amiya3'), false);
    assert.ok(customRoom.data.backups.diy.prototypes['5'].includes('char_4217_makoto'));
    assert.equal(customRoom.data.bands.band_kun, undefined);
    assert.equal(customRoom.data.bonds.rhodeShip, undefined);
    assert.equal((await guest.request({ t: 'room.leave' })).t, 'ok');
    assert.equal((await guest.request({ t: 'room.join', code: customState.code })).t, 'ok');
    const customGuestState = await guest.waitFor('room.state');
    assert.deepEqual(customGuestState.modOptions, customState.modOptions);
    assert.equal(customGuestState.contentHash, customState.contentHash);
    assert.equal((await follower.request({ t: 'room.spectate', code: customState.code })).t, 'ok');
    const spectatorState = await follower.waitFor('room.state');
    assert.deepEqual(spectatorState.modOptions, customState.modOptions);
    assert.equal(spectatorState.contentHash, customState.contentHash);
    const guestWelcome = welcomes[2];
    custom.clearInbox();
    await guest.terminate();
    await custom.waitFor('room.state', (s) => s.seats.some((seat) => seat?.playerId === guestWelcome.playerId && seat.connected === false));
    const reconnected = await TestClient.connect(`ws://127.0.0.1:${server.port}/ws`); clients.push(reconnected);
    const resumed = await reconnected.hello('Guest', guestWelcome.token);
    assert.equal(resumed.resumed, true);
    assert.equal(resumed.playerId, guestWelcome.playerId);
    const restored = await reconnected.waitFor('room.state');
    assert.equal(restored.code, customState.code);
    assert.deepEqual(restored.modOptions, customState.modOptions);
    assert.equal(restored.contentHash, customState.contentHash);
    assert.deepEqual(customRoom.modOptions, customState.modOptions, 'reconnecting does not change the authoritative room rules');
    assert.equal(customRoom.contentHash, customState.contentHash);
    assert.equal(customRoom.seatOf(guestWelcome.playerId).connected, true);
    assert.ok(Object.isFrozen(customRoom.modOptions) && Object.isFrozen(customRoom.modOptions.additions));
    assert.equal((await vanilla.request({ t: 'room.create', mode: 'solo', difficulty: 'NORMAL', mods: ['marisa'], modOptions: { existing: { vanillaChars: ['char_9999_unknown'] } } })).t, 'error');
  } finally { await Promise.all(clients.map((c) => c.terminate())); await server.close(); }
});
