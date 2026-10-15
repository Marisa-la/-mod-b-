#!/usr/bin/env node
// Complete source distribution, including local changes, without game art or dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { zipFolder } from './package.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, '.cache', 'dist');
fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
const stage = fs.mkdtempSync(path.join(root, '.cache', 'marisa-source-'));
const sourceRoot = path.join(stage, 'Stronghold-Protocol');
try {
  const result = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0 || result.error) throw new Error('Git must be available to package source');
  const files = [...new Set(result.stdout.toString('utf8').split('\0').filter(Boolean))].sort();
  for (const rel of files) {
    if (/^(?:\.git\/|\.cache\/|\.pnpm-store\/|node_modules\/|public\/(?:assets|fonts|vendor)\/|data\/local-assets\.json$)/.test(rel)) continue;
    const src = path.join(root, rel);
    if (!fs.existsSync(src) || !fs.statSync(src).isFile()) continue;
    const dest = path.join(sourceRoot, rel); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(src, dest);
  }
  fs.mkdirSync(dist, { recursive: true });
  const zip = path.join(dist, 'Stronghold-Protocol-0.2.6-marisa-source.zip');
  zipFolder(stage, zip);
  console.log(zip);
} finally {
  // The stage is mkdtemp's absolute child of this repository's .cache.
  fs.rmSync(stage, { recursive: true, force: true });
}
