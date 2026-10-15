import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomProfile } from '../../server/mods.js';
import { getData } from '../../server/data.js';
import {
  enabledModBondMembers, MOD_ADDED_OPERATORS, MOD_BOND_IDS, MOD_EXISTING_VARIANTS,
  MOD_STRATEGY_IDS, defaultModOptions, isDefaultModOptions, validModOptions,
} from '../../shared/mods.js';
import { checkDiyPick, diyPool, diyRecord, validateDiyPicks } from '../../shared/diy.js';
import { createDataStore } from '../../public/js/data.js';
import { KITTED_CHARS } from '../../server/sim/content/kits/index.js';
import { KITS, kitOf } from '../../server/sim/content/index.js';
import { DataSource } from '../../server/sim/simdata.js';
import { makeBattle, checkInvariants } from '../helpers/battleHarness.js';
import { pickOptions } from '../../public/js/ui/diyModel.js';

const base = roomProfile([], getData());
const full = roomProfile(['marisa'], getData());

test('the legacy room.create choice still selects the complete Marisa profile', () => {
  const legacy = roomProfile(['marisa'], getData(), null);
  assert.deepEqual(legacy.modOptions, defaultModOptions());
  assert.equal(legacy.contentHash, full.contentHash);
  assert.equal(isDefaultModOptions(legacy.modOptions), true);
  assert.deepEqual(legacy.data, full.data);
});

test('existing operators independently restore original records and bond affiliations', () => {
  const warfarin = 'char_171_bldsk';
  const changed = roomProfile(['marisa'], getData(), { existing: { vanillaChars: [warfarin] } });
  for (const id of ['chess_char_4_26_a', 'chess_char_4_26_b', 'chess_char_5_04_a', 'chess_char_5_04_b']) {
    assert.deepEqual(changed.data.chess[id], base.data.chess[id]);
  }
  assert.deepEqual(full.data.chess.chess_char_4_26_a.bonds, ['miraShip', 'rhodeShip']);
  assert.deepEqual(changed.data.chess.chess_char_4_26_a.bonds, ['miraShip']);
  const originalGroup = roomProfile(['marisa'], getData(), { existing: { enabled: false } });
  assert.deepEqual(originalGroup.data.backups.diy.operators.char_4179_monstr.bonds, base.data.backups.diy.operators.char_4179_monstr.bonds);
  assert.notEqual(changed.contentHash, originalGroup.contentHash, 'the per-operator switch leaves other operators unchanged');
});

test('two added operators can use the shop or either DIY tier with their MOD kits', () => {
  const shop = full.data;
  const diy = roomProfile(['marisa'], getData(), { additions: { diyChars: MOD_ADDED_OPERATORS.map((x) => x.charId) } }).data;
  const ds = new DataSource(diy, null);
  for (const { charId, chessId } of MOD_ADDED_OPERATORS) {
    assert.equal(shop.chess[chessId].visible, true);
    assert.equal(shop.backups.diy.prototypes['5'].includes(charId), false);
    assert.equal(diy.chess[chessId].visible, false, `${charId} leaves the normal shop`);
    for (const tier of [5, 6]) {
      assert.ok(diy.backups.diy.prototypes[tier].includes(charId), `${charId} appears at tier ${tier}`);
      const normalId = `chess_char_${tier}_diy1_a`;
      const legal = checkDiyPick(normalId, { charId }, diy);
      assert.deepEqual(legal, { ok: true, pick: { charId, skillIndex: shop.chess[chessId].backup.skillIndex, uniEquipId: null } });
      assert.ok(diyPool(tier, { data: diy, kitted: KITTED_CHARS }).includes(charId));
      assert.ok(validateDiyPicks({ [normalId]: { charId } }, { data: diy, kitted: KITTED_CHARS }).ok, `${charId}: real kit validation`);
      for (const elite of [false, true]) {
        const slotId = `chess_char_${tier}_diy1_${elite ? 'b' : 'a'}`;
        const def = ds.getChess(slotId, { diy: legal.pick });
        assert.equal(kitOf(def, KITS), KITS[`chess_${charId}`], `${charId}: the appended MOD kit at ${slotId}`);
        const h = makeBattle({ data: ds, units: [{ uid: 1, diy: { slot: tier, charId }, elite, row: 10, col: 4 }], timeLimit: 10 });
        h.step();
        h.unit(1).skill.gainSp(999);
        h.run(4);
        checkInvariants(h.b);
        assert.deepEqual(h.b.errors, [], `${charId}: normal/elite prototype deployment`);
      }
    }
  }
  const disabled = roomProfile(['marisa'], getData(), { additions: { disabledChars: ['char_4217_makoto'] } }).data;
  assert.equal(Object.values(disabled.chess).some((c) => c.charId === 'char_4217_makoto'), false);
  assert.equal(disabled.backups.diy.prototypes['5'].includes('char_4217_makoto'), false);
  assert.ok(Object.values(disabled.chess).some((c) => c.charId === 'char_1037_amiya3'), 'other enabled additions remain available');
  const allDisabled = roomProfile(['marisa'], getData(), { additions: { enabled: false } }).data;
  for (const { charId } of MOD_ADDED_OPERATORS) {
    assert.equal(Object.values(allDisabled.chess).some((c) => c.charId === charId), false);
    assert.equal(allDisabled.backups.diy.prototypes['5'].includes(charId), false);
    assert.equal(allDisabled.backups.diy.ownedPool.includes(charId), base.data.backups.diy.ownedPool.includes(charId));
  }
});

test('existing Angelina and Kaltsit variants switch to original records without losing owned DIY candidates', () => {
  const overlapping = MOD_EXISTING_VARIANTS.map((op) => op.charId);
  const restored = roomProfile(['marisa'], getData(), { existing: { vanillaChars: overlapping } }).data;
  const originalSource = new DataSource(base.data, null);
  for (const charId of overlapping) {
    const op = MOD_EXISTING_VARIANTS.find((item) => item.charId === charId);
    assert.equal(restored.chess[op.chessId], undefined, `${charId}: MOD shop variant is removed`);
    assert.equal(Object.values(restored.chess).some((rec) => rec.charId === charId), false, 'normal and elite shop variants are both removed');
    assert.deepEqual(restored.backups.units[charId], base.data.backups.units[charId]);
    assert.deepEqual(restored.backups.diy.operators[charId], base.data.backups.diy.operators[charId]);
    assert.ok(diyPool(6, { data: restored, kitted: KITTED_CHARS }).includes(charId));
    const pick = { charId, skillIndex: 2, uniEquipId: null };
    assert.ok(validateDiyPicks({ chess_char_6_diy1_a: pick }, { data: restored, kitted: KITTED_CHARS }).ok);
    const source = new DataSource(restored, null);
    for (const slotId of ['chess_char_6_diy1_a', 'chess_char_6_diy1_b']) {
      assert.deepEqual(diyRecord(slotId, pick, { data: restored }), diyRecord(slotId, pick, { data: base.data }));
      assert.equal(kitOf(source.getChess(slotId, { diy: pick }), KITS), KITS[charId]);
      for (const tokenId of diyRecord(slotId, pick, { data: restored }).tokens) {
        const token = source.getDiyToken(tokenId, slotId, pick), originalToken = originalSource.getDiyToken(tokenId, slotId, pick);
        assert.deepEqual(token.stats, originalToken.stats);
        assert.deepEqual(token.skill, originalToken.skill);
        assert.deepEqual(token.rangeGrid, originalToken.rangeGrid);
      }
    }
  }
});

test('appended DIY operators are exclusive across V and VI in either selection order', () => {
  const data = roomProfile(['marisa'], getData(), { additions: { diyChars: MOD_ADDED_OPERATORS.map((op) => op.charId) } }).data;
  const v = 'chess_char_5_diy1_a', vi = 'chess_char_6_diy1_a';
  for (const { charId } of MOD_ADDED_OPERATORS) {
    for (const [first, second] of [[v, vi], [vi, v]]) {
      const duplicate = validateDiyPicks({ [first]: { charId }, [second]: { charId } }, { data, kitted: KITTED_CHARS });
      assert.equal(duplicate.error, 'BAD_TARGET', `${charId}: cannot fill both tiers`);
      assert.match(duplicate.detail, /fills one slot/);
      assert.equal(pickOptions(second, { [first]: { charId } }, data, KITTED_CHARS).find((op) => op.charId === charId).taken, first);
      assert.ok(validateDiyPicks({ [second]: { charId } }, { data, kitted: KITTED_CHARS }).ok, `${charId}: can move after clearing the first slot`);
    }
  }
});

test('existing bond additions depend on enabled operators and can be disabled per member', () => {
  const fullChoices = enabledModBondMembers(defaultModOptions());
  assert.deepEqual(fullChoices.map(({ bondId }) => bondId), [
    'lateranoShip', 'preciShip', 'indomShip', 'siracusaShip', 'swiftShip', 'miraShip', 'visiShip', 'emptyShip',
  ]);
  const makotoOff = { additions: { disabledChars: ['char_4217_makoto'] } };
  assert.equal(enabledModBondMembers(makotoOff).some((x) => x.charId === 'char_4217_makoto'), false);
  assert.equal(enabledModBondMembers(makotoOff).some((x) => x.bondId === 'indomShip'), false);
  assert.equal(enabledModBondMembers({ existing: { vanillaChars: ['char_1015_aglna2'] } }).some((x) => x.charId === 'char_1015_aglna2'), false);
  assert.equal(enabledModBondMembers({ additions: { enabled: false } }).some((x) => x.charId === 'char_4217_makoto' || x.charId === 'char_1037_amiya3'), false);

  const noMakotoIndom = roomProfile(['marisa'], getData(), { existingBondMembers: { disabledIds: ['indomShip:char_4217_makoto'] } }).data;
  assert.deepEqual(noMakotoIndom.chess.chess_char_4217_makoto_a.bonds, ['lateranoShip', 'preciShip']);
  assert.ok(noMakotoIndom.bonds.indomShip.members.every((id) => id !== 'chess_char_4217_makoto_a'));

  const noMakotoBonds = roomProfile(['marisa'], getData(), { existingBondMembers: { disabledIds: [
    'lateranoShip:char_4217_makoto', 'preciShip:char_4217_makoto', 'indomShip:char_4217_makoto',
  ] } }).data;
  assert.deepEqual(noMakotoBonds.chess.chess_char_4217_makoto_a.bonds, ['emptyShip']);

  const noKaltsFallback = roomProfile(['marisa'], getData(), { existingBondMembers: { disabledIds: ['emptyShip:char_1052_kalts2'] } }).data;
  assert.deepEqual(noKaltsFallback.chess.chess_char_1052_kalts2_a.bonds, ['rhodeShip'], 'the explicit emptyShip opt-out is not re-added by fallback');
  assert.ok(noKaltsFallback.bonds.emptyShip.members.every((id) => id !== 'chess_char_1052_kalts2_a'));
});

test('manager options reject unknown added operators and bond members', () => {
  assert.equal(validModOptions({ additions: { disabledChars: ['char_unknown'] } }), false);
  assert.equal(validModOptions({ existingBondMembers: { disabledIds: ['indomShip:char_unknown'] } }), false);
  assert.equal(validModOptions({ bonds: { memberOverrides: { 'rhodeShip:char_unknown': false } } }), false);
  assert.equal(validModOptions({ bonds: { memberOverrides: { 'rhodeShip:char_003_kalts': 'false' } } }), false);
});

test('new bond member choices override operator mode for shop and DIY records', () => {
  const kalts = 'char_003_kalts';
  const excluded = roomProfile(['marisa'], getData(), { bonds: { memberOverrides: {
    [`rhodeShip:${kalts}`]: false, 'rhodeShip:char_171_bldsk': false, 'rhodeShip:char_1052_kalts2': false,
  } } });
  assert.deepEqual(excluded.data.backups.diy.operators[kalts].bonds, ['emptyShip']);
  for (const rec of Object.values(excluded.data.chess).filter((r) => ['char_171_bldsk', 'char_1052_kalts2'].includes(r.charId))) {
    assert.equal(rec.bonds.includes('rhodeShip'), false, `${rec.chessId}: the alliance member choice wins`);
    assert.equal(excluded.data.bonds.rhodeShip.members.includes(rec.chessId), false);
  }
  assert.notEqual(excluded.contentHash, full.contentHash);

  const included = roomProfile(['marisa'], getData(), {
    existing: { vanillaChars: [kalts] }, bonds: { memberOverrides: { [`rhodeShip:${kalts}`]: true } },
  }).data;
  assert.deepEqual(included.backups.units[kalts], base.data.backups.units[kalts], 'original skills and modules are preserved');
  assert.deepEqual(included.backups.diy.operators[kalts].bonds, ['emptyShip', 'rhodeShip']);
  for (const slotId of ['chess_char_6_diy1_a', 'chess_char_6_diy1_b']) {
    assert.ok(diyRecord(slotId, { charId: kalts, skillIndex: 2, uniEquipId: null }, { data: included }).bonds.includes('rhodeShip'));
  }

  const amiyaDiy = roomProfile(['marisa'], getData(), {
    additions: { diyChars: ['char_1037_amiya3'] }, bonds: { memberOverrides: { 'rhodeShip:char_1037_amiya3': false } },
  }).data;
  for (const tier of ['5', '6']) assert.deepEqual(amiyaDiy.backups.diy.locked[tier].char_1037_amiya3.bonds, ['visiShip']);

  const disabledBond = roomProfile(['marisa'], getData(), {
    bonds: { enabled: false, memberOverrides: { [`rhodeShip:${kalts}`]: true } },
  }).data;
  assert.equal(disabledBond.bonds.rhodeShip, undefined);
  assert.equal(disabledBond.backups.diy.operators[kalts].bonds.includes('rhodeShip'), false);
});

test('removed additions leave no unresolved bond member IDs', () => {
  const data = roomProfile(['marisa'], getData(), { existing: { enabled: false }, additions: { enabled: false } }).data;
  for (const [bondId, bond] of Object.entries(data.bonds)) {
    for (const id of bond.members) assert.ok(data.chess[id]?.bonds?.includes(bondId), `${bondId}: ${id}`);
  }
});

test('bond switches remove only added affiliations and use the original 协防干员 fallback', () => {
  const noRhodes = roomProfile(['marisa'], getData(), { bonds: { disabledIds: ['rhodeShip'] } }).data;
  assert.equal(noRhodes.bonds.rhodeShip, undefined);
  assert.deepEqual(noRhodes.chess.chess_char_1037_amiya3_a.bonds, ['visiShip']);
  assert.deepEqual(noRhodes.chess.chess_char_1052_kalts2_a.bonds, ['emptyShip']);
  assert.deepEqual(noRhodes.chess.chess_char_4_26_a.bonds, base.data.chess.chess_char_4_26_a.bonds);

  const stripped = roomProfile(['marisa'], getData(), { bonds: { disabledIds: [...MOD_BOND_IDS] } }).data;
  assert.deepEqual(stripped.chess.chess_char_4217_makoto_a.bonds, ['lateranoShip', 'preciShip', 'indomShip']);
  assert.deepEqual(stripped.chess.chess_char_1037_amiya3_a.bonds, ['visiShip']);
  assert.deepEqual(stripped.chess.chess_char_5_diy1_a.bonds, [], 'the empty DIY slot is not treated as an operator');
  assert.equal(stripped.bonds.emptyShip.name, '协防干员');
  assert.equal(stripped.bonds['空想'], undefined);

  const removedAllMakoto = roomProfile(['marisa'], getData(), { existingBondMembers: { disabledIds: [
    'lateranoShip:char_4217_makoto', 'preciShip:char_4217_makoto', 'indomShip:char_4217_makoto',
  ] } }).data;
  assert.deepEqual(removedAllMakoto.chess.chess_char_4217_makoto_a.bonds, ['emptyShip']);
});

test('Kun can be disabled without removing original Aegir content', () => {
  const noKun = roomProfile(['marisa'], getData(), { strategies: { disabledIds: MOD_STRATEGY_IDS } }).data;
  assert.equal(noKun.bands.band_kun, undefined);
  assert.equal(noKun.effects.aceffect_band_kun, undefined);
  assert.deepEqual(noKun.bonds.egirShip, full.data.bonds.egirShip);
  assert.ok(noKun.bands.band_bldsk);
});

test('the browser data store composes the same selected room profile as the server', async () => {
  const sourceByUrl = (url) => url.includes('/mods/marisa/') ? full.data : base.data;
  const client = createDataStore({ retryDelays: [], fetch: async (url) => {
    const name = url.split('/').at(-1).replace(/\.json$/, '');
    const value = sourceByUrl(url)[name];
    return value ? { ok: true, json: async () => value } : { ok: false, status: 404 };
  } });
  const options = { additions: { diyChars: ['char_4217_makoto'] }, bonds: { memberOverrides: { 'rhodeShip:char_003_kalts': false } }, strategies: { enabled: false } };
  try {
    await client.setProfile(['marisa'], options);
    await client.loadAll('chess', 'backups', 'bonds', 'bands');
    assert.equal(client.get('chess').chess_char_4217_makoto_a.visible, false);
    assert.ok(client.get('backups').diy.prototypes['5'].includes('char_4217_makoto'));
    assert.ok(client.get('bonds').rhodeShip);
    assert.equal(client.get('backups').diy.operators.char_003_kalts.bonds.includes('rhodeShip'), false);
    assert.equal(client.get('bands').band_kun, undefined);
    assert.deepEqual(client.profileOptions(), { ...defaultModOptions(), additions: { enabled: true, disabledChars: [], diyChars: ['char_4217_makoto'] }, bonds: { enabled: true, disabledIds: [], memberOverrides: options.bonds.memberOverrides }, strategies: { enabled: false, disabledIds: [] } });
    const serverData = roomProfile(['marisa'], getData(), options).data;
    for (const name of ['chess', 'backups', 'bonds', 'bands']) assert.deepEqual(client.get(name), serverData[name], `${name}: client/server member choices agree`);
  } finally { await client.setProfile([]); }
});
