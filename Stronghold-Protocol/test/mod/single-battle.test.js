import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTestArgs, createTestRecording } from '../../tools/mod-test.mjs';
import { UF } from '../../shared/constants.js';

test('single-battle arguments reject typos instead of silently ignoring an intended test', () => {
  assert.throws(() => parseTestArgs(['--skil', '3']), /未知参数/);
  assert.throws(() => parseTestArgs(['--skill']), /缺少/);
  assert.throws(() => createTestRecording({ scenario: 'kun', vanilla: true }), /原版没有/);
  assert.throws(() => createTestRecording({ seconds: 'NaN' }), /seconds/);
});

test('Kun can be tested on a real stage with the selected Ulpian skill, three revives, and actual air attacks', () => {
  const { recording, report } = createTestRecording({ scenario: 'kun', operator: '乌尔比安', skill: '3', 'cast-at': '5', 'fly-at': '10', 'ground-at': '10', seconds: '40' });
  assert.equal(report.chessId, 'chess_char_5_05_a');
  assert.equal(report.skill, 3);
  assert.equal(report.revives, 3);
  assert.ok(report.airHits > 0);
  assert.ok(report.blockedAir > 0);
  assert.equal(report.errors, 0);
  assert.ok(recording.frames.some((f) => f.snap.units.some((u) => u[7] & UF.LIFTOFF)));
});

test('a supplied operator and the real round wave are reproducible without playing the economy loop', () => {
  const options = { scenario: 'wave', operator: '结城理', skill: '3', round: '8', difficulty: 'HARD', seconds: '12', seed: '7' };
  const a = createTestRecording(options), b = createTestRecording(options);
  assert.equal(a.report.chessId, 'chess_char_4217_makoto_a');
  assert.equal(a.report.round, 8);
  assert.deepEqual(a, b);
  assert.equal(a.recording.result.errors, 0);
});

test('Kun with the documented moving wave records airborne blocking without static targets', () => {
  const { report } = createTestRecording({ scenario: 'kun-wave', stage: 'act1autochess_m01', round: '2', difficulty: 'HARD', operator: '乌尔比安', skill: '1', seed: '27', seconds: '40' });
  assert.deepEqual(report.waveComposition, { air: 7, ground: 0 });
  assert.ok(report.states.some((state) => state.liftoff));
  assert.ok(report.blockedAirWhileAirborne > 0);
  assert.equal(report.blockedGroundWhileAirborne, 0);
  assert.ok(report.airHits > 0);
  assert.equal(report.actions.some((action) => action.action === 'fly' || action.action === 'ground'), false);
  assert.equal(report.errors, 0);
});
