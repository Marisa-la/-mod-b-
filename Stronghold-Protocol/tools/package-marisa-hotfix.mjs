#!/usr/bin/env node
// One overlay zip for the already published Marisa full package; never build a new full package.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {listTree, scanFiles, zipFolder} from './package.mjs';
import {manifestText, readZip} from './package-update.mjs';
import {digestFile, inManifest, pathProblem} from '../server/update.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FOLDER = 'Stronghold-Protocol';
const BASE_NAME = 'Stronghold-Protocol-0.3.0-marisa-full.zip';
const BASE_RELEASE = 'marisa-0.3.0-20261016';
const BASE_SHA256 = 'ef016d40ef4df0fd9af7c8d21ddc1f7ff370e900bf8ec1d5f1457cffbd127c4b';
const BASE_SIZE = 501315637;
const NAME = 'Stronghold-Protocol-0.3.0-marisa-hotfix1.zip';
const digest = (body) => ({size: body.length, sha256: crypto.createHash('sha256').update(body).digest('hex')});
const same = (a, b) => !!a && !!b && a.size === b.size && a.sha256 === b.sha256;
const json = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');

function write(root, rel, body) {
  if (pathProblem(rel)) throw Error('Unsafe package path: ' + rel);
  const dest = path.join(root, rel);
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  fs.writeFileSync(dest, body);
}

function unzip(zip, dest, visit) {
  readZip(zip, (entry, body) => {
    if (!entry.startsWith(FOLDER + '/')) throw Error('Unexpected archive root: ' + entry);
    const rel = entry.slice(FOLDER.length + 1);
    if (pathProblem(rel)) throw Error('Unsafe archive path: ' + entry);
    write(dest, rel, body);
    visit?.(rel, body);
  });
}

function readme(files) {
  return Buffer.from(`\ufeff# 魔理沙 MOD 0.3.0 · 第一次修补包

这是此前完整包的增量修补，只携带发生变化的文件、完整性清单和本说明。不能单独运行。

## 适用安装

仅适用于 [${BASE_RELEASE} 发布页](https://github.com/Ruyl114514/marisa-s-mod/releases/tag/${BASE_RELEASE}) 中的 \`${BASE_NAME}\`。
原完整包大小：${BASE_SIZE} 字节；SHA-256：\`${BASE_SHA256}\`。
其他版本、原版 0.3.0、兼容替换包或自行混装的目录不在本次修补范围内。

## 修补作用

- 修正罗德岛溢出治疗攻击加成被百分比攻击加成再次放大的问题；上限为不含罗德岛加成的自身攻击力的 100%，技能结束后重新收紧上限。
- 恢复鲲策略原图的素材映射，沿用原完整包已包含的图片，不重复分发图片。
- 起飞标志按干员当前起飞状态显示，覆盖技能、天赋和鲲起飞，落地后消失。
- 鲲的复活保持原作者效果：达到第三次吞噬实际击倒后免费重新部署前三名被击倒的干员，最后一次击倒的来源起飞。高层阿戈尔的生命提高可能导致击倒不足；吞噬链遇到非阿戈尔成员后停止。

## 安装步骤

1. 停止正在运行的游戏服务（在服务窗口按 Ctrl+C），并备份原安装目录。
2. 解压本修补包，将包内 \`Stronghold-Protocol/\` 中的全部内容合并覆盖到原安装中同名目录；应能在该目录直接看到 \`package.json\`、\`server/\` 和 \`plugins/\`。
3. 同意覆盖同名文件，不需要删除原目录、安装开发依赖或重新下载素材。
4. 重新运行 \`scripts/start-marisa.cmd\`。所有玩家按 Ctrl+F5 强制刷新，重新建房并新建对局；旧对局不会替换已创建的战斗内容。

## 包内内容与校验

实际改变的文件：

${files.map((f) => '- `' + f + '`').join('\n')}

\`HOTFIX.json\` 记录上述文件覆盖前后的大小和 SHA-256，以及原完整包的校验值。\`MANIFEST.json\` 更新为覆盖后的完整运行清单；\`MOD-PACKAGE.json\` 标明修补编号及基准。
\`plugins/marisa/test/guard.test.js\` 是原完整包已携带且插件锁声明的文件，随插件锁同步更新；这里未加入工程根目录的 \`test/\`、开发依赖或未改变的素材。

可在 PowerShell 中运行 \`Get-FileHash .\\${BASE_NAME} -Algorithm SHA256\` 核验原完整包。修补包自身的 SHA-256 见本次发布说明，可同样使用 Get-FileHash 核对。
覆盖后可在安装目录运行 \`node tools/doctor.mjs\` 查看安装清单检查，运行 \`node tools/plugin.mjs check marisa --strict\` 查看插件完整性检查。
源码及本修补包仅限非商业同人用途，版权声明沿用原完整包。
`, 'utf8');
}

function runInstalled(installed, args) {
  const result = spawnSync(process.execPath, args, {
    cwd: installed, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024,
    env: {...process.env, SP_PLUGIN_SCRIPTS: 'sandbox'},
  });
  if (result.error || result.status !== 0) throw Error('Installed check failed: ' + args.join(' ') + '\n' + (result.error?.message || '') + result.stdout + result.stderr);
  return {status: result.status, stdout: result.stdout, stderr: result.stderr};
}

/** Create only the hotfix zip, then test an actual extraction of the published full zip with this zip overlaid. */
export async function packageMarisaHotfix(root = ROOT, {force = false, log = console.log} = {}) {
  const dist = path.join(root, '.cache/dist');
  const baseZip = path.join(dist, BASE_NAME);
  const baseDigest = digestFile(baseZip);
  assert.deepEqual(baseDigest, {size: BASE_SIZE, sha256: BASE_SHA256}, 'The baseline must be the exact previously published full zip');
  const zip = path.join(dist, NAME);
  if (fs.existsSync(zip) && !force) throw Error('Hotfix already exists; use --force to replace only this generated hotfix: ' + zip);
  const cache = path.join(root, '.cache/hotfix-package');
  fs.mkdirSync(cache, {recursive: true});
  const work = fs.mkdtempSync(path.join(cache, 'run-'));
  const installed = path.join(work, 'installed', FOLDER);
  const stageParent = path.join(work, 'patch');
  const stage = path.join(stageParent, FOLDER);
  const baseline = new Map();
  log('Reading the published baseline and extracting a fresh verification installation');
  unzip(baseZip, installed, (rel, body) => {
    if (baseline.has(rel)) throw Error('Duplicate baseline path: ' + rel);
    baseline.set(rel, digest(body));
  });
  const manifestBefore = JSON.parse(fs.readFileSync(path.join(installed, 'MANIFEST.json'), 'utf8'));
  const metadata = JSON.parse(fs.readFileSync(path.join(installed, 'MOD-PACKAGE.json'), 'utf8'));
  assert.equal(metadata.kind, 'full');
  assert.equal(metadata.mod, 'marisa');
  assert.equal(metadata.version, '0.3.0');

  const bundle = path.join(root, 'mods/marisa-native/bundle');
  const candidates = new Map([['data/assets.json', path.join(root, 'data/assets.json')]]);
  for (const rel of listTree(bundle, 'marisa')) candidates.set('plugins/' + rel, path.join(bundle, rel));
  for (const rel of ['docs/MARISA-0.3.0.md', 'docs/MARISA-VALIDATION.md']) {
    if (baseline.has(rel)) candidates.set(rel, path.join(root, rel));
  }
  candidates.set('MARISA-PACKAGE.md', path.join(root, 'docs/MARISA-0.3.0.md'));
  const payload = new Map();
  for (const [rel, source] of candidates) {
    const body = fs.readFileSync(source);
    if (!same(baseline.get(rel), digest(body))) payload.set(rel, body);
  }
  if (!payload.size) throw Error('No changed files to package');
  for (const rel of baseline.keys()) {
    if (rel.startsWith('plugins/marisa/') && !candidates.has(rel)) throw Error('Plugin file removal needs an explicit plan: ' + rel);
  }
  const base = {release: BASE_RELEASE, name: BASE_NAME, ...baseDigest};
  metadata.hotfix = {id: 'hotfix1', base};
  payload.set('MOD-PACKAGE.json', json(metadata));
  payload.set('MARISA-HOTFIX1.md', readme([...payload.keys()].sort()));
  const changes = Object.fromEntries([...payload].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([rel, body]) => [rel, {before: baseline.get(rel) || null, after: digest(body)}]));
  payload.set('HOTFIX.json', json({format: 1, mod: 'marisa', version: '0.3.0', id: 'hotfix1', base, files: changes,
    manifests: ['MANIFEST.json', 'HOTFIX.json'], removed: []}));
  const manifestFiles = new Map(Object.entries(manifestBefore.files));
  for (const [rel, body] of payload) if (inManifest(rel)) manifestFiles.set(rel, digest(body));
  payload.set('MANIFEST.json', Buffer.from(manifestText({app: '0.3.0', files: manifestFiles})));
  for (const [rel, body] of payload) {
    if (same(baseline.get(rel), digest(body))) throw Error('Unchanged file in patch: ' + rel);
    write(stage, rel, body);
  }
  const scans = scanFiles(stage, [...payload.keys()].filter((f) => !['MANIFEST.json', 'HOTFIX.json', 'MOD-PACKAGE.json'].includes(f)), {home: true});
  if (scans.length) throw Error('Unexpected local information in patch: ' + JSON.stringify(scans));
  if (fs.existsSync(zip)) fs.unlinkSync(zip);
  zipFolder(stageParent, zip);

  const shipped = new Map();
  unzip(zip, installed, (rel, body) => {
    if (shipped.has(rel)) throw Error('Duplicate patch path: ' + rel);
    shipped.set(rel, digest(body));
    assert.deepEqual(digest(body), digest(payload.get(rel)), 'The zip must carry the intended bytes: ' + rel);
  });
  assert.equal(shipped.size, payload.size);
  const {checkInstall} = await import(pathToFileURL(path.join(installed, 'server/update.js')).href);
  const installation = checkInstall(installed);
  assert.equal(installation.state, 'ok', JSON.stringify(installation));
  const strict = runInstalled(installed, ['tools/plugin.mjs', 'check', 'marisa', '--strict', '--json']);
  const plugin = JSON.parse(strict.stdout);
  assert.equal(plugin.problems, 0);
  assert.equal(plugin.warnings, 0);
  const tests = runInstalled(installed, ['tools/plugin.mjs', 'test', 'marisa']);
  const health = runInstalled(installed, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import {startServer} from './server/index.js';
    const server = await startServer({host:'127.0.0.1',port:0,quiet:true,studio:false,assetIndex:false});
    try {
      const response = await fetch(server.url + '/healthz');
      assert.equal(response.status, 200);
      const health = await response.json();
      assert.equal(health.ok, true);
      const indexResponse = await fetch(server.url + '/plugins/index.json');
      assert.equal(indexResponse.status, 200);
      const index = await indexResponse.json();
      const marisa = index.plugins.find((plugin) => plugin.id === 'marisa');
      assert.ok(marisa, 'The installed Marisa plugin must be advertised');
      assert.equal(marisa.status, 'loaded');
      console.log(JSON.stringify({health,index}));
    } finally { await server.close(); }
  `]);
  let unchanged = 0;
  for (const [rel, before] of baseline) {
    if (shipped.has(rel)) continue;
    assert.deepEqual(digestFile(path.join(installed, rel)), before, 'An unchanged file was modified: ' + rel);
    unchanged++;
  }
  assert.deepEqual(digestFile(baseZip), baseDigest, 'The published baseline zip must remain unchanged');
  const report = {name: NAME, ...digestFile(zip), base, work, installed, files: Object.fromEntries(shipped),
    unchangedFiles: unchanged, unchangedModifications: 0, installation, plugin, tests, health: JSON.parse(health.stdout)};
  const reportPath = path.join(work, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(cache, 'latest.json'), JSON.stringify({report: reportPath, zip, ...digestFile(zip)}, null, 2) + '\n');
  log(JSON.stringify({name: NAME, ...digestFile(zip), changedFiles: payload.size, unchangedFiles: unchanged, report: reportPath, installed}, null, 2));
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some((arg) => arg !== '--force')) throw Error('Usage: node tools/package-marisa-hotfix.mjs [--force]');
  await packageMarisaHotfix(ROOT, {force: process.argv.includes('--force')});
}
