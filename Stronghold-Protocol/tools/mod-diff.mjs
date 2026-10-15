#!/usr/bin/env node
// Exhaustive generated-profile differences for the maintainer's MOD-manager decisions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT_FILES } from '../shared/mods.js';
import { listedArtFiles } from '../server/update.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const changes = [];
function diff(a, b, at) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (a === undefined) { changes.push({ path: at, action: 'add', after: b }); return; }
  if (b === undefined) { changes.push({ path: at, action: 'remove', before: a }); return; }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) diff(a[key], b[key], [...at, key]);
  } else changes.push({ path: at, action: 'change', before: a, after: b });
}
for (const name of [...CONTENT_FILES, 'bosses', 'skins', 'i18n/en', 'i18n/ja', 'i18n/ko', 'i18n/zh-TW']) {
  const read = (dir) => JSON.parse(fs.readFileSync(path.join(root, 'data', dir, `${name}.json`), 'utf8'));
  diff(read(''), read('mods/marisa'), [name]);
}
const originalArt = new Set(fs.readFileSync(path.join(root, 'tools/marisa-upstream-assets-paths.txt'), 'utf8').split(/\r?\n/).filter((s) => s && !s.startsWith('#')));
const addedArtPaths = [...listedArtFiles(JSON.parse(fs.readFileSync(path.join(root, 'data/assets.json'), 'utf8')))].filter((p) => !originalArt.has(p)).sort();
const output = path.join(root, '.cache', 'marisa-profile-diff.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({ base: 'Stronghold-Protocol 0.2.6', profile: 'marisa', changes, addedArtPaths }, null, 2));
console.log(`${changes.length} data changes; ${addedArtPaths.length} added art paths\n${output}`);
