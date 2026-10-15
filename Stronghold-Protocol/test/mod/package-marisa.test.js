import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { overlayArt, productionModules, runtimePaths } from '../../tools/package-marisa.mjs';

test('replacement retains original art and adds only new referenced assets', () => {
  const full = ['public/assets/chess/original.png', 'public/assets/chess/makoto.png', 'public/fonts/a.woff2', 'data/local-assets.json'];
  assert.deepEqual(overlayArt(full, { chess: '/assets/chess/original.png' }), ['public/assets/chess/makoto.png']);
});

test('production dependencies match lock and exclude development packages', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marisa-prod-test-'));
  try {
    fs.mkdirSync(path.join(root, 'node_modules', 'runtime'), { recursive: true });
    fs.writeFileSync(path.join(root, 'node_modules', 'runtime', 'package.json'), '{"version":"1.2.3"}');
    fs.writeFileSync(path.join(root, 'node_modules', 'runtime', 'index.js'), 'export default 1;');
    const lock = { packages: { 'node_modules/runtime': { version: '1.2.3' }, 'node_modules/dev-only': { version: '1.0.0', dev: true } } };
    assert.deepEqual(productionModules(root, lock), ['node_modules/runtime/index.js', 'node_modules/runtime/package.json']);
    lock.packages['node_modules/runtime'].version = '1.2.4';
    assert.throws(() => productionModules(root, lock), /differs from lock/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('extracted source ZIP uses its own runtime files without Git metadata', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marisa-source-test-'));
  try {
    fs.mkdirSync(path.join(root, 'server'), { recursive: true });
    fs.writeFileSync(path.join(root, 'server', 'index.js'), 'export default 1;');
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(path.join(root, 'private-notes.txt'), 'not a runtime file');
    assert.deepEqual(runtimePaths(root).sort(), ['package.json', 'server/index.js']);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('source ZIP nested in a Git checkout does not use its parent index', (t) => {
  const repository = fileURLToPath(new URL('../../', import.meta.url));
  if (spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: repository }).status !== 0) return t.skip('Git checkout unavailable');
  const cache = path.join(repository, '.cache', 'marisa-deep');
  fs.mkdirSync(cache, { recursive: true });
  const parent = fs.mkdtempSync(path.join(cache, 'parent-test-'));
  try {
    const root = path.join(parent, 'extracted');
    fs.mkdirSync(path.join(root, 'server'), { recursive: true });
    fs.writeFileSync(path.join(root, 'server', 'index.js'), 'export default 1;');
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(path.join(root, 'private-notes.txt'), 'never ship this');
    assert.deepEqual(runtimePaths(root).sort(), ['package.json', 'server/index.js']);
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
});
