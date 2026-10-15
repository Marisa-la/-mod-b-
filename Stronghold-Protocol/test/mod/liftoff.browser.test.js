import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { startServer } from '../../server/index.js';
import { createTestRecording } from '../../tools/mod-test.mjs';

const chrome = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const enabled = process.env.SP_MOD_E2E === '1' && fs.existsSync(chrome);

test('single-battle replay shows takeoff beside HP and grounded allies have no mark', { skip: !enabled, timeout: 90000 }, async () => {
  const file = 'public/dev/recordings/mod-test.json';
  const previous = fs.existsSync(file) ? fs.readFileSync(file) : null;
  fs.mkdirSync('test/e2e/out', { recursive: true });
  const { recording } = createTestRecording({ scenario: 'kun', operator: '乌尔比安', skill: '3', seconds: '25' });
  fs.writeFileSync(file, JSON.stringify(recording));
  const server = await startServer({ port: 0, host: '127.0.0.1', log: { info() {}, warn() {}, error() {} } });
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.port}/dev/render-demo.html?scene=mod-test&mods=marisa&board=2d&paused=1&t=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__demo?.ready || window.__demo?.error, { timeout: 45000 });
    assert.equal(await page.evaluate(() => window.__demo.error || null), null);
    await page.waitForFunction(() => [...window.__demo.view.debug.views.values()].some((v) => v.info.defId === 'chess_char_5_05_a' && v.spineReady && v.liftoffIcon.visible));
    const hud = await page.evaluate(() => [...window.__demo.view.debug.views.values()].filter((v) => v.liftoffIcon && !v.isEnemy && !v.isToken).map((v) => ({ name: v.info.name, id: v.info.defId, shown: v.liftoffIcon.visible, x: v.liftoffIcon.x, hpRight: v.hpBg.x + v.hpBg.width })));
    assert.equal(hud.find((u) => u.id === 'chess_char_5_05_a').shown, true);
    assert.ok(hud.filter((u) => u.id !== 'chess_char_5_05_a').every((u) => !u.shown));
    assert.ok(hud.filter((u) => u.shown).every((u) => u.x > u.hpRight));
    await page.screenshot({ path: 'test/e2e/out/marisa-liftoff-mark.png' });
    const clip = await page.evaluate(() => {
      const v = [...window.__demo.view.debug.views.values()].find((v) => v.info.defId === 'chess_char_5_05_a');
      const b = v.liftoffIcon.getBounds();
      return { x: Math.max(0, b.x - 180), y: Math.max(0, b.y - 80), width: 360, height: 220 };
    });
    await page.screenshot({ path: 'test/e2e/out/marisa-liftoff-detail.png', clip });
    assert.deepEqual(errors, []);
    fs.writeFileSync('test/e2e/out/marisa-liftoff-report.json', JSON.stringify(hud, null, 2));
  } finally {
    await browser?.close(); await server.close();
    if (previous) fs.writeFileSync(file, previous); else fs.rmSync(file, { force: true });
  }
});
