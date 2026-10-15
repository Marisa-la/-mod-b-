import fs from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { startServer } from '../../server/index.js';
import { roomProfile } from '../../server/mods.js';
import { getData } from '../../server/data.js';
import { DataSource } from '../../server/sim/simdata.js';
import { buildBattleSpec, createBattleFromSpec } from '../../server/sim/spec.js';
import { makeBattle } from '../helpers/battleHarness.js';
import { test } from 'node:test';
const chrome = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const enabled = process.env.SP_MOD_E2E === '1' && fs.existsSync(chrome);

test('new alliance member switches override operator mode', { skip: !enabled, timeout: 60000 }, async (t) => {
  const server = await startServer({ port: 0, host: '127.0.0.1', log: { info() {}, warn() {}, error() {} } });
  t.after(() => server.close());
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--no-first-run', '--disable-gpu-sandbox'] });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.title-login input');
  await page.type('.title-login input', 'Member QA'); await page.click('.title-login button');
  await page.waitForSelector('.lobby-screen');
  assert.equal(await page.$eval('.mod-manager > summary', (el) => el.textContent.trim()), 'MOD 管理器');
  assert.equal(await page.$eval('.mod-manager', (el) => el.open), false, 'collapsed manager shows only its MOD title');
  await page.click('.mod-manager summary');
  assert.equal(await page.$$('.mod-manager__group').then((groups) => groups.length), 0, 'disabled MOD hides its options');
  await page.click('.mod-manager__master input');
  await page.waitForFunction(() => document.querySelectorAll('.mod-manager__group').length > 0);
  assert.equal(await page.$$eval('.mod-manager__group', (groups) => groups.every((group) => !group.open)), true, 'enabled option groups start collapsed');
  await page.$$eval('.mod-manager__group', (groups) => groups.filter((group) => {
    const title = group.querySelector(':scope > summary')?.textContent || '';
    return title.includes('已有干员') || title.includes('追加盟约');
  }).forEach((group) => { group.open = true; }));
  const member = '.mod-manager__members label[title="rhodeShip:char_003_kalts"] input';
  const mode = '.mod-manager__list label[title="char_003_kalts"] select';
  const bond = '.mod-manager__bond > label[title="rhodeShip"] input';
  const chooseMode = async (value) => {
    await page.waitForSelector(mode);
    await page.select(mode, value);
    await page.waitForFunction((original) => globalThis.__SP__.data.profileOptions()?.existing?.vanillaChars?.includes('char_003_kalts') === original
      && !!globalThis.__SP__.data.get('backups'), {}, value === 'original');
  };
  await page.waitForFunction((selector) => document.querySelector(selector)?.checked === true, {}, member);
  await page.click(member);
  await page.waitForFunction(() => globalThis.__SP__.data.get('backups')?.diy?.operators?.char_003_kalts?.bonds?.includes('rhodeShip') === false);
  await chooseMode('original');
  await chooseMode('mod');
  await page.waitForFunction(() => globalThis.__SP__.data.profileOptions()?.bonds?.memberOverrides?.['rhodeShip:char_003_kalts'] === false
    && globalThis.__SP__.data.get('backups')?.diy?.operators?.char_003_kalts?.bonds?.includes('rhodeShip') === false);
  assert.equal(await page.$eval(member, (el) => el.checked), false);
  await chooseMode('original');
  await page.click(member);
  await page.waitForFunction(() => globalThis.__SP__.data.profileOptions()?.existing?.vanillaChars?.includes('char_003_kalts')
    && globalThis.__SP__.data.get('backups')?.diy?.operators?.char_003_kalts?.bonds?.includes('rhodeShip'));
  await page.click(bond);
  await page.waitForFunction(() => globalThis.__SP__.data.get('bonds') && !globalThis.__SP__.data.get('bonds').rhodeShip);
  await page.click(bond);
  await page.waitForFunction(() => globalThis.__SP__.data.get('backups')?.diy?.operators?.char_003_kalts?.bonds?.includes('rhodeShip'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction((selector) => document.querySelector(selector)?.checked === true, {}, member);
  await page.waitForSelector(mode);
  assert.equal(await page.$eval(mode, (el) => el.value), 'original');
  assert.deepEqual(errors, []);
});

test('MOD manager, persistent skins and Node/Chromium profile parity', { skip: !enabled, timeout: 120000 }, async (t) => {
  fs.mkdirSync('test/e2e/out', { recursive: true });

  const server = await startServer({ port: 0, host: '127.0.0.1', log: { info() {}, warn() {}, error() {} } });
  t.after(() => server.close());
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--no-first-run', '--disable-gpu-sandbox'], protocolTimeout: 120000 });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(`http://127.0.0.1:${server.port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.title-login input');
    await page.type('.title-login input', 'QA'); await page.click('.title-login button');
    await page.waitForSelector('.lobby-screen');
    await page.click('.mod-manager summary');
    assert.equal(await page.$eval('.mod-manager input', (e) => e.checked), false);
    await page.click('.mod-manager input');
    await page.$$eval('.mod-manager__group', (groups) => groups.forEach((group) => { group.open = true; }));
    await page.waitForFunction(() => globalThis.__SP__.data.lookup('chess', 'chess_char_4217_makoto_a'));
    await page.waitForFunction(() => {
      const group = [...document.querySelectorAll('.mod-manager__group')].find((el) => el.querySelector('summary')?.textContent.includes('已有干员'));
      return ['char_1015_aglna2', 'char_1052_kalts2'].every((id) => group?.querySelector(`label[title="${id}"] select`));
    });
    assert.deepEqual(await page.$$eval('.mod-manager__group', (groups) => {
      const group = groups.find((el) => el.querySelector('summary')?.textContent.includes('追加干员'));
      return [...(group?.querySelectorAll(':scope > .mod-manager__list > label') || [])].map((row) => row.title);
    }), ['char_4217_makoto', 'char_1037_amiya3'], 'only genuinely new operators appear under additions');
    const originalBondOptions = async () => page.$$eval('.mod-manager__group--nested > summary', (rows) => rows.map((row) => row.textContent));
    assert.ok((await originalBondOptions()).some((name) => name.includes('不屈')));
    await page.$eval('.mod-manager__list--operators label[title="char_4217_makoto"] input[type="checkbox"]', (el) => { el.checked = false; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForFunction(() => ![...document.querySelectorAll('.mod-manager__group--nested > summary')].some((row) => row.textContent.includes('不屈')));
    await page.$eval('.mod-manager__list--operators label[title="char_4217_makoto"] input[type="checkbox"]', (el) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForFunction(() => [...document.querySelectorAll('.mod-manager__group--nested > summary')].some((row) => row.textContent.includes('不屈')));
    await page.evaluate(() => {
      const group = [...document.querySelectorAll('.mod-manager__group')].find((el) => el.querySelector('summary')?.textContent.includes('追加干员'));
      for (const charId of ['char_4217_makoto', 'char_1037_amiya3']) {
        const row = [...group.querySelectorAll('label')].find((el) => el.title === charId);
        const select = row.querySelector('select'); select.value = 'diy'; select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForFunction(() => ['char_4217_makoto', 'char_1037_amiya3'].every((id) =>
      ['5', '6'].every((tier) => globalThis.__SP__.data.get('backups')?.diy?.prototypes?.[tier]?.includes(id))));
    assert.equal(await page.evaluate(() => globalThis.__SP__.data.lookup('chess', 'chess_char_4217_makoto_a').visible), false);
    await page.screenshot({ path: 'test/e2e/out/marisa-mod-manager.png' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.lobby-screen');
    assert.equal(await page.$eval('.mod-manager input', (e) => e.checked), true);
    await page.waitForFunction(() => {
      const group = [...document.querySelectorAll('.mod-manager__group')].find((el) => el.querySelector('summary')?.textContent.includes('追加干员'));
      return ['char_4217_makoto', 'char_1037_amiya3'].every((id) => [...(group?.querySelectorAll('label') || [])].find((el) => el.title === id)?.querySelector('select')?.value === 'diy');
    });
    await page.waitForFunction(() => globalThis.__SP__.store.get().connection.status === 'online');
    await page.click('.create-box button');
    await page.waitForFunction(() => globalThis.__SP__.store.get().room?.modOptions?.additions?.diyChars?.includes('char_4217_makoto'));
    await page.waitForSelector('.room-screen');
    await page.screenshot({ path: 'test/e2e/out/marisa-mod-room.png' });
    const room = await page.evaluate(() => globalThis.__SP__.store.get().room);
    const profile = roomProfile(['marisa'], getData(), room.modOptions);
    const prototypePicks = [['chess_char_5_diy1_a', 'char_4217_makoto'], ['chess_char_6_diy1_a', 'char_1037_amiya3']];
    const kitted = await page.evaluate(async () => (await import('/js/ui/loadoutSync.js')).loadoutStore.get().diyKitted);
    assert.ok(prototypePicks.every(([, id]) => kitted.includes(id)), 'welcome.diyKitted enables both MOD-only prototype candidates');
    await page.click('.room-screen [data-testid="loadout-open"]');
    await page.waitForSelector('.lo .lo-tab[data-tab="diy"]', { visible: true });
    await page.click('.lo .lo-tab[data-tab="diy"]');
    for (const [slotId, charId] of prototypePicks) {
      await page.waitForSelector(`.diy-slot[data-slot="${slotId}"] .diy-slot__fill`, { visible: true });
      await page.click(`.diy-slot[data-slot="${slotId}"] .diy-slot__fill`);
      const option = `[data-testid="diy-picker"] .diy-opt[data-char="${charId}"]`;
      await page.waitForSelector(option, { visible: true });
      if (slotId === 'chess_char_6_diy1_a') {
        const listed = await page.$$eval('[data-testid="diy-picker"] .diy-opt', (els) => els.map((el) => el.dataset.char));
        assert.ok(['char_4217_makoto', 'char_1037_amiya3'].every((id) => listed.includes(id)), 'enabled added operators appear at tier VI');
        assert.ok(['char_1015_aglna2', 'char_1052_kalts2'].every((id) => !listed.includes(id)), 'existing operators in MOD shop mode do not duplicate their owned candidates');
        assert.equal(await page.$eval('[data-testid="diy-picker"] .diy-opt[data-char="char_4217_makoto"]', (el) => el.disabled), true, 'Makoto already selected at V is disabled at VI');
      }
      assert.deepEqual(await page.$$eval(`${option} .diy-bond`, (els) => els.map((el) => el.textContent.trim())),
        profile.data.backups.diy.operators[charId].bonds.map((id) => profile.data.bonds[id].name), `${charId}: picker shows the MOD affiliations`);
      await page.$eval(option, (el) => el.scrollIntoView({ block: 'nearest' }));
      await page.click(option);
      await page.click('[data-testid="diy-confirm"]');
      await page.waitForSelector('[data-testid="diy-picker"]', { hidden: true });
      await page.waitForFunction((slot, id) => document.querySelector(`.diy-slot[data-slot="${slot}"]`)?.dataset.char === id, {}, slotId, charId);
      await page.waitForFunction(() => /已同步/.test(document.querySelector('[data-testid="diy-sync"]')?.textContent || ''));
      const seat = server.lobby.rooms.get(room.code).seatOf(room.hostId);
      assert.equal(seat.diy[slotId].charId, charId, 'real room.diy accepts the prototype selection');
      const tier = profile.data.backups.diy.slots[slotId].tier;
      assert.equal(seat.diy[slotId].skillIndex, profile.data.backups.diy.locked[tier][charId].skillIndex);
      assert.deepEqual(await page.$$eval(`.diy-slot[data-slot="${slotId}"] .diy-bond`, (els) => els.map((el) => el.textContent.trim())),
        profile.data.backups.diy.operators[charId].bonds.map((id) => profile.data.bonds[id].name));
    }
    const savedPicks = await page.evaluate(() => JSON.parse(localStorage.getItem('sp.pref.diy')).picks);
    assert.ok(prototypePicks.every(([slot, id]) => savedPicks[slot]?.charId === id), 'both prototype selections are persisted');
    await page.click('.diy-slot[data-slot="chess_char_5_diy2_a"] .diy-slot__fill');
    await page.waitForSelector('[data-testid="diy-picker"] .diy-opt[data-char="char_1037_amiya3"]', { visible: true });
    assert.equal(await page.$eval('[data-testid="diy-picker"] .diy-opt[data-char="char_1037_amiya3"]', (el) => el.disabled), true, 'medical Amiya already selected at VI is disabled at V');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="diy-picker"]', { hidden: true });
    await page.screenshot({ path: 'test/e2e/out/marisa-mod-diy.png' });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.lo'));
    const enemy = Object.values(profile.data.enemies).find((x) => !x.isBoss && x.key.startsWith('enemy_'))?.key;
    for (const kind of ['normal', 'unite', 'boss']) {
      const h = makeBattle({ data: new DataSource(profile.data), stageId: 'act1autochess_m01', kind, timeLimit: 6,
        units: [{ chessId: 'chess_char_4217_makoto_a', row: 10, col: 4 }], enemies: [{ key: enemy, time: 0 }] });
      const spec = buildBattleSpec({ ...h.b.opts, battleId: `qa.${kind}`, fieldId: 'qa', mods: ['marisa'], contentHash: profile.contentHash });
      const b = createBattleFromSpec(spec, new DataSource(profile.data));
      for (let i = 0; i < 180; i++) b.step(); if (!b.finished) b.forceEnd('qa');
      const result = await page.evaluate(async (spec, modOptions) => {
        const { loadBrowserSim } = await import('/js/battle/runner.js');
        const sim = await loadBrowserSim({ dataBase: '/data/mods/marisa/', modOptions, contentHash: spec.contentHash });
        const b = sim.spec.createBattleFromSpec(spec, sim.ds);
        for (let i = 0; i < 180; i++) b.step(); if (!b.finished) b.forceEnd('qa');
        if (b.errors.length) throw Error(JSON.stringify(b.errors));
        return b.result();
      }, spec, room.modOptions);
      assert.deepEqual(result, JSON.parse(JSON.stringify(b.result())), `${kind}: Node/Chromium parity`);
    }
    const mismatch = await page.evaluate(async () => {
      const { loadBrowserSim } = await import('/js/battle/runner.js');
      try { await loadBrowserSim({ dataBase: '/data/mods/marisa/', contentHash: 'bad' }); return false; } catch { return true; }
    });
    assert.ok(mismatch);
    const skin = await page.evaluate(async () => {
      const { data } = await import('/js/data.js'); const skin = await import('/js/ui/skinModel.js');
      await data.loadAll('assets', 'skins');
      const options = skin.availableSkins(data.get('assets'), data.get('skins'), 'char_4217_makoto');
      if (!options.length) throw Error('downloaded skin is unavailable');
      skin.setSkin('char_4217_makoto', options[0].id);
      return skin.selectedSkin('char_4217_makoto');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!globalThis.__SP__);
    assert.equal(await page.evaluate(async () => (await import('/js/ui/skinModel.js')).selectedSkin('char_4217_makoto')), skin);
    assert.deepEqual(errors, []);
    fs.writeFileSync('test/e2e/out/marisa-browser-report.json', JSON.stringify({ passed: true, engine: 'Edge Chromium', parity: ['normal', 'unite', 'boss'], checks: ['manager default', 'original DIY operators listed', 'V and VI DIY route selection', 'cross-tier exclusive MOD picks', 'prototype picker and room.diy acceptance', 'prototype MOD affiliations', 'persisted room preference', 'custom profile content hash', 'content mismatch rejection', 'skin persistence'], errors }, null, 2));

  } finally { await browser.close(); await server.close(); }
});

test('four MOD models and Makoto skin draw with the official animation clips', { skip: !enabled, timeout: 120000 }, async (t) => {
  fs.mkdirSync('test/e2e/out', { recursive: true });
  const server = await startServer({ port: 0, host: '127.0.0.1', log: { info() {}, warn() {}, error() {} } });
  t.after(() => server.close());
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], protocolTimeout: 120000 });
  try {
    t.after(() => browser.close());
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900 });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.port}/dev/render-demo.html?scene=prep&panel=0&board=2d`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__demo?.ready || window.__demo?.error, { timeout: 45000 });
    assert.equal(await page.evaluate(() => window.__demo.error || null), null);
    await page.evaluate(async () => {
      const { data } = await import('/js/data.js'); const { assets } = await import('/js/assets.js');
      const skins = await import('/js/ui/skinModel.js');
      await data.setProfile(['marisa']); await data.loadAll('chess', 'tokens', 'skins', 'assets');
      skins.setSkin('char_4217_makoto', 'char_4217_makoto@p3r#1'); assets.seed(skins.assetsFor());
      const ids = ['chess_char_4217_makoto_a', 'chess_char_1015_aglna2_a', 'chess_char_1052_kalts2_a', 'chess_char_1037_amiya3_a'];
      const board = ids.map((id, i) => ({ uid: 900 + i, kind: 'chess', id, golden: false, tier: data.lookup('chess', id).tier, items: [], row: 11, col: 2 + 2 * i, dir: 'RIGHT' }));
      window.__demo.view.setPrep({ hand: Array(10).fill(null), temp: Array(5).fill(null), board, nextEnemies: [] }, { editable: false });
    });
    await page.waitForFunction(() => {
      const views = window.__demo.view.debug.views;
      return [900,901,902,903].every((id) => views.get('p:'+id)?.spineReady);
    }, { timeout: 45000 });
    const models = await page.evaluate(() => [900,901,902,903].map((id) => {
      const v = window.__demo.view.debug.views.get('p:'+id);
      return { id, char: v.info.defId, ready: !!v.spineReady, visible: !!v.root.visible, animations: v.actor.spine.spineData.animations.map((a) => a.name) };
    }));
    assert.equal(models.length, 4); assert.ok(models.every((m) => m.ready && m.visible));
    assert.ok(models[0].animations.some((name) => name.startsWith('Doll_Skill_')));
    await page.screenshot({ path: 'test/e2e/out/marisa-mod-models.png' });
    await page.evaluate(() => window.__demo.view.debug.views.get('p:900').setForm('doll3p1', { dur: 10 }));
    await page.waitForFunction(() => window.__demo.view.debug.views.get('p:900').actor.spine.state.getCurrent(0)?.animation?.name?.startsWith('Doll_Skill_3_P1'), { timeout: 5000 });
    await page.screenshot({ path: 'test/e2e/out/marisa-makoto-mask.png' });
    await page.evaluate(() => window.__demo.view.debug.views.get('p:900').setForm(null));
    assert.equal(await page.evaluate(() => window.__demo.view.debug.views.get('p:900').form), null);
    assert.deepEqual(errors, []);
    fs.writeFileSync('test/e2e/out/marisa-model-report.json', JSON.stringify({ passed: true, models, errors }, null, 2));

  } finally { await browser.close(); await server.close(); }
});
