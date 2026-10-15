import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Match } from '../../server/match/Match.js';
import { VirtualScheduler } from '../../server/match/scheduler.js';
import { getData } from '../../server/data.js';
import { roomProfile } from '../../server/mods.js';
import { loadBrowserSim } from '../../public/js/battle/runner.js';
import { profileBase } from '../../shared/mods.js';

const quiet = { info() {}, warn() {}, error() {}, debug() {} };
const configurations = [
  { name: 'original', mods: [] },
  { name: 'default MOD', mods: ['marisa'] },
  { name: 'custom MOD', mods: ['marisa'], modOptions: { bonds: { memberOverrides: { 'rhodeShip:char_003_kalts': false } } } },
];

for (const mode of ['solo', 'coop']) for (const config of configurations) {
  test(`${mode} ${config.name}: actual match specs load browser data and spawn enemies`, async (t) => {
    const profile = roomProfile(config.mods, getData(), config.modOptions);
    const scheduler = new VirtualScheduler();
    const starts = [];
    const match = new Match({
      ...profile, mode, difficulty: 'NORMAL', roomCode: 'TEST', seed: 27, scheduler, clientCombat: true,
      seats: [{ seat: 0, playerId: 'p_0', name: 'QA', isBot: false, connected: true }],
      send: (_pid, msg) => { if (msg.t === 'b.start') starts.push(msg); return true; },
      broadcast() {}, onEnd() {}, log: quiet, botRehearsal: 0,
    });
    t.after(() => match.dispose());
    match.start();
    match.handle('p_0', { t: 'g.infoReady' });
    assert.ok(scheduler.runUntil(() => match.phase === 'BAND_DRAFT'));
    match.handle('p_0', { t: 'g.band', bandId: 'band_bldsk' });
    assert.ok(scheduler.runUntil(() => match.phase === 'PREP'));
    match.handle('p_0', { t: 'g.ready', ready: true });
    assert.ok(scheduler.runUntil(() => starts.length > 0));
    const spec = JSON.parse(JSON.stringify(starts[0].spec));
    assert.ok(spec.spawns.length > 0, 'the match scheduled enemies');
    // Use the real browser loader and its actual URLs; only transport is replaced with local file reads.
    const sim = await loadBrowserSim({
      base: new URL('../../server/sim/', import.meta.url).href,
      dataBase: profileBase(spec.mods), modOptions: spec.modOptions, contentHash: spec.contentHash,
      fetchFn: async (url) => ({ ok: true, json: async () => JSON.parse(await readFile(new URL(`../..${url}`, import.meta.url), 'utf8')) }),
    });
    const battle = sim.spec.createBattleFromSpec(spec, sim.ds, { quiet: true });
    const result = battle.runToEnd(900);
    assert.ok(battle.total > 0 && battle.killed + battle.leakedCount > 0, 'enemies actually spawned and resolved');
    assert.equal(result.errors, 0);
    assert.deepEqual(spec.modOptions ?? null, profile.modOptions);
    match.onDisconnect('p_0');
    starts.length = 0;
    match.onReconnect('p_0');
    assert.ok(starts.length > 0, 'reconnecting player receives the running battle');
    assert.deepEqual(starts[0].spec.modOptions ?? null, profile.modOptions);
  });
}
