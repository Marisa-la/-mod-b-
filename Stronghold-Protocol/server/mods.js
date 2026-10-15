import path from 'node:path';
import { getData, loadData, DATA_DIR, deepFreeze } from './data.js';
import { contentHash, CONTENT_FILES, composeModData, normalizeModOptions, validModOptions, validMods } from '../shared/mods.js';
const profiles = new WeakMap();
export function roomProfile(mods = [], base = getData(), rawOptions = null) {
  if (!validMods(mods)) throw new Error('unknown mod selection');
  if (mods.length && !validModOptions(rawOptions, base)) throw new Error('invalid mod manager options');
  let cached = profiles.get(base);
  if (!cached) { cached = {}; profiles.set(base, cached); }
  const options = mods.length ? normalizeModOptions(rawOptions) : null;
  const key = mods.length ? `marisa:${JSON.stringify(options)}` : 'vanilla';
  if (!cached[key]) {
    const modFiles = mods.length ? loadData(path.join(DATA_DIR, 'mods', 'marisa'), { expected: CONTENT_FILES }) : null;
    if (mods.length && !modFiles?.chess?.chess_char_4217_makoto_a) throw new Error('marisa data unavailable; run npm run build:mod');
    const extended = mods.length ? { ...base, ...modFiles } : base;
    const data = mods.length ? deepFreeze(composeModData(base, extended, options)) : base;
    cached[key] = Object.freeze({ data, mods: Object.freeze([...mods]), modOptions: options && deepFreeze(options), contentHash: contentHash(data) });
  }
  return cached[key];
}
