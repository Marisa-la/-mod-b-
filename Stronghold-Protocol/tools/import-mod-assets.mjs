#!/usr/bin/env node
// Optional local art import from an extracted replacement package. Never imports code,
// UPDATE.json or MANIFEST.json. The package's local manifest may describe absent base files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const manifestFile = path.join(root, 'data', 'local-assets.json');
if (process.argv[2]) {
  const source = path.resolve(process.argv[2]);
  fs.cpSync(path.join(source, 'public', 'assets'), path.join(publicDir, 'assets'), { recursive: true });
  const manifest = path.join(source, 'data', 'local-assets.json');
  if (fs.existsSync(manifest)) fs.copyFileSync(manifest, manifestFile);
}
if (fs.existsSync(manifestFile)) {
  const doc = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const groups = {};
  let count = 0;
  for (const [group, entries] of Object.entries(doc.groups || {})) {
    const present = {};
    for (const [name, entry] of Object.entries(entries)) {
      if (typeof entry.path !== 'string' || !entry.path.startsWith('/assets/local/')) continue;
      const abs = path.resolve(publicDir, '.' + decodeURIComponent(entry.path));
      if (!abs.startsWith(path.join(publicDir, 'assets', 'local') + path.sep) || !fs.existsSync(abs)) continue;
      present[name] = entry; count++;
    }
    if (Object.keys(present).length) groups[group] = present;
  }
  if (count) fs.writeFileSync(manifestFile, JSON.stringify({ ...doc, count, groups }) + '\n');
  else fs.unlinkSync(manifestFile); // No extracted files: keep the optional-manifest absence sentinel.
  console.log(`local art: ${count} existing entries; unavailable package references omitted`);
}
