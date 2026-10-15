import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { startServer } from '../../server/index.js';

const chrome = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const enabled = process.env.SP_MOD_E2E === '1' && fs.existsSync(chrome);

test('custom room options reach live solo/co-op browser battles and enemies appear', { skip: !enabled, timeout: 90000 }, async (t) => {
  const server = await startServer({ port: 0, host: '127.0.0.1', seedFn: () => 27, log: { info() {}, warn() {}, error() {} } });
  t.after(() => server.close());
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--no-first-run'] });
  t.after(() => browser.close());
  for (const mode of ['solo', 'coop']) {
    const context = await browser.createBrowserContext();
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (msg) => { if (msg.text().includes('[runner]')) errors.push(msg.text()); });
      await page.goto(`http://127.0.0.1:${server.port}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.title-login input');
      await page.type('.title-login input', 'Spawn QA');
      await page.click('.title-login button');
      await page.waitForSelector('.lobby-screen');
      await page.evaluate(async (mode) => {
        const { net } = globalThis.__SP__;
        globalThis.__spawnSpec = null;
        globalThis.__enemiesAppeared = false;
        net.on('b.start', (msg) => { globalThis.__spawnSpec = msg.spec; });
        // No operators are deployed: a live unit in a post-start frame must be an enemy.
        globalThis.__SP_RUNNER__.on('snap', (msg) => {
          if (msg.gt > 0 && msg.units?.length > 0) globalThis.__enemiesAppeared = true;
        });
        await net.request('room.create', { mode, difficulty: 'NORMAL', mods: ['marisa'],
          modOptions: { bonds: { memberOverrides: { 'rhodeShip:char_003_kalts': false } } } });
        await net.request('room.start');
      }, mode);
      await page.waitForFunction(() => globalThis.__SP__.store.get().match.public?.phase === 'INFO_CHECK');
      await page.evaluate(() => globalThis.__SP__.net.request('g.infoReady'));
      await page.waitForFunction(() => globalThis.__SP__.store.get().match.public?.phase === 'BAND_DRAFT');
      await page.evaluate(() => globalThis.__SP__.net.request('g.band', { bandId: 'band_bldsk' }));
      await page.waitForFunction(() => globalThis.__SP__.store.get().match.public?.phase === 'PREP');
      await page.evaluate(() => globalThis.__SP__.net.request('g.ready', { ready: true }));
      await page.waitForFunction(() => globalThis.__enemiesAppeared, { timeout: 20000 });
      const state = await page.evaluate(() => ({
        spec: globalThis.__spawnSpec,
        options: globalThis.__SP__.store.get().room.modOptions,
        battle: globalThis.__SP__.store.get().match.battle,
      }));
      assert.deepEqual(state.spec.modOptions, state.options, `${mode}: the real lobby passes its entire room configuration`);
      assert.ok(state.spec.spawns.length > 0 && !state.battle.loading, `${mode}: the real browser runner spawned enemies`);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
});
