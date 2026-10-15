import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataStore } from '../../public/js/data.js';

const ok = (value) => ({ ok: true, json: async () => value });
const overlay = (name) => ({ files: {}, names: { '结城理': name } });
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

for (const staleResult of ['success', 'failure']) {
  test(`a late ${staleResult} from a previous profile cannot replace or evict the current translation`, async () => {
    const old = deferred();
    const calls = [];
    const data = createDataStore({ retryDelays: [], fetch: async (url) => {
      calls.push(url);
      if (url === '/data/i18n/en.json') return old.promise;
      return ok(overlay('Makoto (MOD)'));
    } });
    const oldLoad = data.setLocale('en');
    await data.setProfile(['marisa']);
    assert.equal(data.localeName('结城理'), 'Makoto (MOD)');
    old.resolve(staleResult === 'success' ? ok(overlay('stale vanilla')) : { ok: false, status: 404 });
    await oldLoad;
    assert.equal(data.localeName('结城理'), 'Makoto (MOD)');
    await data.setLocale('zh');
    await data.setLocale('en');
    assert.equal(calls.filter((u) => u === '/data/mods/marisa/i18n/en.json').length, 1, 'old failure cannot evict the new promise');
    assert.equal(data.localeName('结城理'), 'Makoto (MOD)');
  });
}

test('same-language profile changes notify rendered views when the new overlay arrives after gameplay data', async () => {
  const nextOverlay = deferred();
  const data = createDataStore({ retryDelays: [], fetch: async (url) => {
    if (url === '/data/mods/marisa/i18n/en.json') return nextOverlay.promise;
    if (url.endsWith('/i18n/en.json')) return ok(overlay('Vanilla name'));
    return ok({ unit: { name: '结城理' } });
  } });
  await data.load('chess');
  await data.setLocale('en');
  const rendered = [];
  data.subscribe((name) => { if (name === 'chess') rendered.push(data.localeName('结城理')); });
  const switching = data.setProfile(['marisa']);
  await data.load('chess');
  nextOverlay.resolve(ok(overlay('Makoto (MOD)')));
  await switching;
  assert.equal(rendered.at(-1), 'Makoto (MOD)', 'a view receives the ready translation without another UI action');
});
