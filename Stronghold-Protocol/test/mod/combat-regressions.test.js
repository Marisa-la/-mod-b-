import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomProfile } from '../../server/mods.js';
import { DataSource } from '../../server/sim/simdata.js';
import { makeBattle, enemyRec, checkInvariants } from '../helpers/battleHarness.js';

const MOD = roomProfile(['marisa']).data;
const AMIYA = 'chess_char_1037_amiya3';
const MAKOTO = 'chess_char_4217_makoto';
const ANCHOR = 'token_10068_kalts2_mtship';
const approx = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${msg}: ${a} != ${b}`);
const tags = (c, tag) => c.dmg?.tags?.includes(tag);

function field({ id = AMIYA, form = 'a', skill = 0, units = [], enemies = {}, ...opts } = {}) {
  return makeBattle({
    timeLimit: 120, autoFinish: false, captureNoisy: true,
    data: new DataSource({ ...MOD, enemies: {
      dummy: enemyRec({ key: 'dummy', hp: 1e7, atk: 0, speed: 0 }), ...enemies,
    } }, null),
    units: [{ uid: 1, chessId: `${id}_${form}`, skillIndex: skill, row: 10, col: 4 }, ...units],
    ...opts,
  });
}
function cast(u) { u.skill.gainSp(999); assert.equal(u.skill.activate('test'), true); }
function clean(h) { checkInvariants(h.b); assert.deepEqual(h.b.errors, []); }

for (const form of ['a', 'b']) {
  test(`Amiya S1 ${form}: extra healing requires an active skill and an ordinary attack hit`, () => {
    const h = field({ form, units: [{ uid: 2, chessId: 'chess_char_1_02_a', row: 11, col: 4 }] });
    h.step(); const u = h.unit(1), ally = h.unit(2);
    const e = h.spawn('dummy', { pos: [10, 5] });
    h.b.loseHp(ally, ally.hp * 0.8);
    h.run(3);
    assert.ok(h.hooksOf('damaged').some(c => c.source === u && c.dmg.isAttack), 'ordinary attack actually landed');
    const extras = () => h.hooksOf('heal').filter(c => c.source === u && c.opts?.tags?.includes('amiya3_s1'));
    assert.equal(extras().length, 0, 'no S1 bonus while inactive');
    cast(u); h.b.loseHp(ally, ally.hp * 0.5); h.run(3);
    assert.ok(extras().length > 0, 'S1 bonus is present during real attack');
    const count = extras().length;
    h.b.dealDamage(u, e, { amount: 100, type: 'arts', tags: ['bond:rhodeShip'] });
    assert.equal(extras().length, count, 'bond damage must not masquerade as an attack');
    u.skill.end('test'); h.b.loseHp(ally, ally.hp * 0.5); h.run(3);
    assert.equal(extras().length, count, 'bonus ends with the skill'); clean(h);
  });

  test(`Amiya S2 ${form}: target stacks strengthen the opening burst and expire with the skill; once per battle`, () => {
    const h = field({ form, skill: 1 }); h.step(); const u = h.unit(1);
    for (let i = 0; i < 7; i++) h.spawn('dummy', { pos: [10, 5] });
    h.step(); // Enemy spatial indexing advances on the simulation tick.
    const baseAtk = u.s.atk, bb = MOD.chess[`${AMIYA}_${form}`].skills[1].bb;
    cast(u);
    const hits = h.hooksOf('damaged').filter(c => c.source === u && tags(c, 'amiya3Burst'));
    assert.equal(hits.length, 7); assert.equal(u.mem.amiya3S2Stacks, bb.max_stack_cnt);
    for (const hit of hits) approx(hit.amount, baseAtk * (1 + bb.atk * bb.max_stack_cnt) * bb.atk_scale, 'opening burst uses capped stacks');
    h.run(3);
    assert.ok(h.hooksOf('damaged').some(c => c.source === u && c.dmg.isAttack && c.type === 'true'), 'subsequent ordinary attacks are true damage');
    u.skill.end('test'); approx(u.s.atk, baseAtk, 'temporary stacks expire');
    u.skill.gainSp(999); assert.equal(u.skill.activate('test'), false, 'second cast refused');
    h.b.retreat(u); assert.equal(h.b.redeploy(u, { free: true }), true);
    u.skill.gainSp(999); assert.equal(u.skill.activate('test'), false, 'redeploy does not reset the battle limit'); clean(h);
  });

  test(`Makoto S3 ${form}: actual attacks choose the weaker physical/arts resistance per enemy`, () => {
    const h = field({ id: MAKOTO, form, skill: 2, enemies: {
      resistArts: enemyRec({ key: 'resistArts', hp: 1e7, atk: 0, def: 0, res: 90, speed: 0 }),
      resistPhys: enemyRec({ key: 'resistPhys', hp: 1e7, atk: 0, def: 1e6, res: 0, speed: 0 }),
    } });
    h.step(); const u = h.unit(1); cast(u); h.run(1.1);
    const physical = h.spawn('resistArts', { pos: [10, 5] });
    const arts = h.spawn('resistPhys', { pos: [11, 4] }); h.run(3);
    const hits = h.hooksOf('damaged').filter(c => c.source === u && c.dmg.isAttack);
    assert.ok(hits.some(c => c.target === physical && c.type === 'phys'), 'high RES target takes physical weakness damage');
    assert.ok(hits.some(c => c.target === arts && c.type === 'arts'), 'high DEF target takes arts weakness damage'); clean(h);
  });

  test(`Makoto ${form}: another unit dying cannot trigger his substitute-end burst`, () => {
    const h = field({ id: MAKOTO, form, skill: 0 }); h.step(); const u = h.unit(1);
    cast(u); h.run(1.1); const victim = h.spawn('dummy', { pos: [10, 5] });
    h.spawn('dummy', { pos: [11, 4] });
    h.b.loseHp(victim, 1e9);
    assert.equal(h.hooksOf('damaged').filter(c => tags(c, 'makotoSees')).length, 0, 'unrelated death is not a state transition');
    h.run(21);
    assert.ok(h.hooksOf('damaged').some(c => tags(c, 'makotoSees')), 'own timed substitute end still bursts'); clean(h);
  });
}

test('Kun activates through the real Egir opening chain, revives each victim once, and attacks/blocks air', () => {
  const h = field({ id: 'chess_char_1_04', skill: 0, bandId: 'band_kun',
    bonds: { egirShip: { active: true, count: 3, tier: 1, layers: 0 } },
    units: [
      { uid: 2, chessId: 'chess_char_2_07_a', row: 10, col: 5 },
      { uid: 3, chessId: 'chess_char_3_09_a', row: 10, col: 6 },
      { uid: 4, chessId: 'chess_char_1_08_a', row: 10, col: 7 },
    ], enemies: { fly: enemyRec({ key: 'fly', hp: 1e7, speed: 0, motion: 'FLY' }) },
  });
  h.step(); const u = h.unit(1);
  const deaths = h.hooksOf('death').filter(c => c.reason === 'killed');
  assert.equal(deaths.length, 3, 'real devour killed exactly the three marked operators');
  assert.ok(u.s.flags.liftoff && u.s.flags.blockFly && u.profile.canHitFly);
  for (const uid of [2, 3, 4]) {
    assert.ok(h.unit(uid).alive);
    assert.equal(h.hooksOf('deploy').filter(c => c.unit === h.unit(uid)).length, 2, 'one opening deploy and one revive');
  }
  const fly = h.spawn('fly', { pos: [10, 4.2] }); h.run(3);
  assert.equal(fly.blockedBy, u);
  assert.ok(h.hooksOf('damaged').some(c => c.source === u && c.target === fly), 'air unit actually attacked');
  clean(h);
});

test('Rhodes feedback is bounded with an injured incantation medic and a real adjacent enemy', () => {
  const h = field({ skill: 0, bonds: { rhodeShip: { active: true, count: 2, tier: 2, layers: 100 }, miraShip: { active: true, count: 2, tier: 1, layers: 100 } },
    units: [{ uid: 2, chessId: 'chess_char_1052_kalts2_a', row: 11, col: 4 }],
  });
  h.step(); const u = h.unit(1), healer = h.unit(2); h.spawn('dummy', { pos: [10, 5] }); h.step();
  h.b.loseHp(u, u.hp * 0.8); const start = h.hooksOf('damaged').length;
  h.b.heal(healer, u, 50);
  const feedback = h.hooksOf('damaged').slice(start).filter(c => tags(c, 'bond:rhodeShip'));
  assert.equal(feedback.length, 1, 'one outer strike, no recursive extra strike');
  assert.ok(h.hooksOf('heal').some(c => c.source === u && c.opts?.tags?.includes('incantation')), 'incantation feedback really happened');
  h.run(5); clean(h);
});

test('all four kits plus placed anchor stay deterministic across twelve seeds and three field kinds', () => {
  const run = (seed, kind) => {
    const h = field({ id: MAKOTO, form: seed % 2 ? 'a' : 'b', skill: seed % 3, seed, kind,
      units: [
        { uid: 2, chessId: `chess_char_1015_aglna2_${seed % 2 ? 'a' : 'b'}`, skillIndex: seed % 3, row: 11, col: 4 },
        { uid: 3, chessId: 'chess_char_1052_kalts2_b', skillIndex: 2, row: 10, col: 6 },
        { uid: 4, chessId: 'chess_char_1037_amiya3_b', skillIndex: seed % 2, row: 11, col: 6 },
        { uid: 5, kind: 'token', tokenId: ANCHOR, ownerUid: 3, row: 10, col: 7 },
      ],
    });
    h.step();
    const r = kind === 'boss' ? 3 : 10;
    for (let i = 0; i < 4; i++) h.spawn('dummy', { pos: [r + i % 2, 5 + i % 3] });
    for (const u of h.allies()) if (u.kind === 'op') u.skill.gainSp(999);
    for (let i = 0; i < 30; i++) { h.run(1); clean(h); }
    return [h.result(), h.snapshot(), h.events];
  };
  for (const kind of ['normal', 'unite', 'boss']) {
    for (let seed = 1; seed <= 12; seed++) assert.deepEqual(run(seed, kind), run(seed, kind), `${kind} seed=${seed}`);
  }
});
