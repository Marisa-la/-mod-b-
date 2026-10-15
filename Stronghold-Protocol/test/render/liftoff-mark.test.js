import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { installFakePixi, fakeViewCtx } from './fakepixi.js';
import { presetCamera } from '../../public/js/render/projection.js';
import { UF, ANIM } from '../../shared/constants.js';
import { roomProfile } from '../../server/mods.js';
import { DataSource } from '../../server/sim/simdata.js';
import { makeBattle } from '../helpers/battleHarness.js';

let fake, UnitView;
before(async () => { fake = installFakePixi(); ({ UnitView } = await import('../../public/js/render/units.js')); });
after(() => fake.restore());
const camera = () => presetCamera('normal', { width: 1280, height: 720 });

test('a real Kun takeoff reaches the HP HUD through the snapshot and clears when the buff ends', () => {
  const h = makeBattle({ data: new DataSource(roomProfile(['marisa']).data), bandId: 'band_kun',
    bonds: { egirShip: { active: true, count: 3, tier: 1, layers: 0 } }, timeLimit: 40, units: [
      { uid: 1, chessId: 'chess_char_1_04_a', row: 10, col: 4 },
      { uid: 2, chessId: 'chess_char_2_07_a', row: 10, col: 5 },
      { uid: 3, chessId: 'chess_char_3_09_a', row: 10, col: 6 },
      { uid: 4, chessId: 'chess_char_1_08_a', row: 10, col: 7 },
    ] });
  h.step();
  const u = h.unit(1);
  assert.ok(u.s.flags.liftoff);
  const v = new UnitView(fakeViewCtx(fake.P), { id: u.id, kind: 'op', side: 'ally', defId: u.defId, x: u.x, y: u.y, maxHp: u.s.maxHp });
  const sync = () => {
    const tuple = h.snapshot().units.find((x) => x[0] === u.id);
    v.sync({ x: tuple[1], y: tuple[2], hp: tuple[3], maxHp: tuple[4], sp: tuple[5], spMax: tuple[6], flags: tuple[7], anim: tuple[8] }, h.b.time);
    v.update(1 / 60, camera(), h.b.time);
  };
  sync();
  assert.equal(v.liftoffIcon.visible, true);
  assert.ok(v.liftoffIcon.x > v.hpBg.x + v.hpBg.width, 'takeoff mark sits beside the HP bar');
  assert.equal(v.flying, false, 'a ground operator with takeoff is not converted into an intrinsic flying model');
  // Remove the active buff to exercise the same snapshot-to-HUD path for landing.
  for (const buff of [...u.buffs]) if (buff.flags?.liftoff) h.b.removeBuff(u, buff);
  sync();
  assert.equal(v.liftoffIcon.visible, false);
  v.destroy();
});

test('grounded operators, preparation pieces, dead operators and flying enemies do not show the takeoff mark', () => {
  for (const cfg of [
    { kind: 'op', side: 'ally', flags: 0 },
    { kind: 'op', side: 'ally', flags: UF.FLYING },
    { kind: 'op', side: 'ally', flags: UF.LIFTOFF, prep: true },
    { kind: 'op', side: 'ally', flags: UF.LIFTOFF, hp: 0, anim: ANIM.DIE },
    { kind: 'enemy', side: 'enemy', flags: UF.LIFTOFF | UF.FLYING },
  ]) {
    const v = new UnitView(fakeViewCtx(fake.P), { id: 1, kind: cfg.kind, side: cfg.side, defId: 'dummy', x: 4, y: 10, maxHp: 1000 }, { prep: !!cfg.prep });
    v.sync({ x: 4, y: 10, hp: cfg.hp ?? 1000, maxHp: 1000, sp: 0, spMax: 0, flags: cfg.flags, anim: cfg.anim ?? ANIM.IDLE }, 2);
    v.update(1 / 60, camera(), 2);
    assert.equal(v.liftoffIcon.visible, false, JSON.stringify(cfg));
    v.destroy();
  }
});
