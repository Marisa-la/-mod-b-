#!/usr/bin/env node
// Manual same-version overlay + complete player bundle. Art and dependencies stay in .cache/dist.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import {
  FOLDER, PLAYER_MARKDOWN, GENERATED_PACK_INDEX, listTree, plan, playerPackageJson,
  rewritePlayerDoc, stageProblems, zipFolder, ROOT_FILES, PLAYER_DOCS, RUNTIME_RESEARCH,
  PLAYER_SCRIPTS, PLAYER_TOOLS, PLAYER_TOOL_DIRS, RUNTIME_DIRS,
  PLAYER_TEST_VIEW,
  GITHUB_REPO, releaseTag,
} from './package.mjs';
import { diffBases, manifestText, readBase } from './package-update.mjs';
import { writePackIndex } from './packs.mjs';
import { digestFile, inManifest, listedArtFiles } from '../server/update.js';

export const UPSTREAM = '488db49f11daf862b67ce26fa4cf89aa6cba2466';
export const SOURCE_RELEASE = 'https://github.com/Ruyl114514/marisa-s-mod/blob/marisa-0.2.6-20261015/Stronghold-Protocol';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Copy only npm's production lock entries, and refuse a different installed version. */
export function productionModules(root, lock) {
  const result = new Set();
  for (const [rel, entry] of Object.entries(lock.packages || {})) {
    if (!rel.startsWith('node_modules/') || entry.dev || entry.link) continue;
    const pkg = JSON.parse(fs.readFileSync(path.join(root, rel, 'package.json'), 'utf8'));
    if (pkg.version !== entry.version) throw new Error(`installed dependency differs from lock: ${rel}`);
    for (const f of listTree(root, rel)) {
      if (!f.slice(rel.length + 1).includes('node_modules/')) result.add(f);
    }
  }
  return [...result].sort();
}

/** The overlay adds art URLs absent in vanilla's versioned manifest; original art stays on the install. */
export function overlayArt(fullArt, vanillaManifest) {
  const original = vanillaManifest instanceof Set ? vanillaManifest : listedArtFiles(vanillaManifest);
  return fullArt.filter((rel) => !original.has(rel) && !rel.startsWith('public/fonts/') && rel !== 'data/local-assets.json');
}

export function runtimePaths(root) {
  // An extracted source ZIP can itself live inside another repository. Do not take that parent's index.
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' });
  if (!top.error && top.status === 0 && fs.realpathSync(top.stdout.trim()) === fs.realpathSync(root)) {
    const result = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
    if (!result.error && result.status === 0) return [...new Set(result.stdout.toString('utf8').split('\0').filter(Boolean))];
  }
  // A source ZIP has no Git metadata: use the same explicit player allowlist and whole runtime directories.
  const paths = [...ROOT_FILES, ...PLAYER_DOCS, ...RUNTIME_RESEARCH, ...PLAYER_SCRIPTS, ...PLAYER_TOOLS].filter((rel) => fs.existsSync(path.join(root, rel)));
  for (const dir of [...RUNTIME_DIRS, ...PLAYER_TOOL_DIRS]) paths.push(...listTree(root, dir.replace(/\/$/, '')));
  return [...new Set(paths)];
}

function copy(root, stage, rel) {
  const destination = path.join(stage, rel);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, rel), destination);
}

function pruneEmptyDirectories(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = path.join(dir, entry.name);
    pruneEmptyDirectories(child);
    if (!fs.readdirSync(child).length) fs.rmdirSync(child);
  }
}

export function packageMarisa({ root = ROOT, keepStage = false, vanillaBase = null } = {}) {
  const dist = path.join(root, '.cache', 'dist');
  fs.mkdirSync(dist, { recursive: true });
  const paths = runtimePaths(root);
  // Numeric Windows account names also occur inside official numeric lookup tables (three.js).
  // Keep the home-path scan and explicitly configured names; avoid treating a float as personal information.
  const scanEnv = /^\d+$/.test(os.userInfo().username) ? { ...process.env, SP_PACKAGE_SCAN_USER: '0' } : process.env;
  const p = plan(root, { paths, allowDirty: true, env: scanEnv });
  if (p.version !== '0.2.6') throw new Error('this overlay is specifically for upstream 0.2.6');
  if (p.problems.length) throw new Error(p.problems.join('\n'));
  const base = vanillaBase ? readBase(vanillaBase) : null;
  if (base && (base.version !== p.version || base.update)) throw new Error('replacement base must be an unmodified full 0.2.6 installation or ZIP');
  const vanilla = new Set(fs.readFileSync(path.join(root, 'tools', 'marisa-upstream-assets-paths.txt'), 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')));
  const additions = overlayArt(p.art, vanilla);
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const libs = [...productionModules(root, lock), ...listTree(root, 'public/vendor')];
  for (const required of ['pixi.min.js', 'pixi-spine.js', 'preact.module.js', 'hooks.module.js', 'htm.module.js', 'three.core.js', 'three.module.js']) {
    if (!libs.includes(`public/vendor/${required}`)) throw new Error(`missing vendor: ${required}`);
  }
  const shipped = new Set([...p.tracked, ...p.generated]);
  const result = [];
  for (const kind of ['replacement', 'full']) {
    const work = fs.mkdtempSync(path.join(dist, 'marisa-stage-'));
    const stage = path.join(work, FOLDER);
    const name = `${FOLDER}-0.2.6-marisa-${kind}.zip`;
    try {
      const art = kind === 'full' ? p.art : additions;
      const files = [...new Set([...p.tracked, ...art, ...libs])].sort();
      for (const rel of files) copy(root, stage, rel);
      const pkg = playerPackageJson(JSON.parse(fs.readFileSync(path.join(stage, 'package.json'), 'utf8')), shipped);
      fs.writeFileSync(path.join(stage, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
      for (const rel of PLAYER_MARKDOWN) {
        const rewritten = rewritePlayerDoc(fs.readFileSync(path.join(stage, rel), 'utf8'), rel, shipped, p.version)
          .replaceAll(`${GITHUB_REPO}/blob/${releaseTag(p.version)}/`, `${SOURCE_RELEASE}/`);
        fs.writeFileSync(path.join(stage, rel), rewritten);
      }
      if (p.generated.includes(GENERATED_PACK_INDEX)) writePackIndex(stage, path.join(stage, GENERATED_PACK_INDEX));
      const instructions = kind === 'replacement'
        ? '关闭服务器。先备份原版 0.2.6 安装；确认原版没有待应用的 UPDATE.json。将 ZIP 内 Stronghold-Protocol 的内容合并到原安装并覆盖同名文件，勿删除原有素材。此包为同版本手动替换包，不使用上游跨版本自动更新协议。'
        : '将 ZIP 内 Stronghold-Protocol 解压到新目录。包含运行依赖、前端库、清单所列素材；不需要 Git。可选官方本地 3D 场景未包含，使用默认棋盘。';
      fs.writeFileSync(path.join(stage, 'MARISA-PACKAGE.md'), `# marisa MOD 0.2.6\n\n${instructions}\n\n需要 Node.js 22 或更新版本。Windows 双击 scripts/start-windows.bat，其他系统运行 npm start。大厅 MOD 管理器默认关闭；房主勾选 marisa MOD 后创建房间，加入者跟随房间配置。\n\n素材版权归原权利人，限非商业同人用途。源码、许可证与行为差异见 LICENSE、NOTICE.md、docs/MODS.md。\n`);
      fs.writeFileSync(path.join(stage, 'MOD-PACKAGE.json'), `${JSON.stringify({ format: 1, mod: 'marisa', version: '0.2.6', kind, upstream: UPSTREAM, install: kind === 'replacement' ? 'manual-overlay-on-vanilla-0.2.6' : 'fresh-directory', dependencies: 'package-lock production entries', changedOnly: kind === 'replacement' && !!base, artFiles: art.length, localScenes: p.scenes.files.length }, null, 2)}\n`);
      const manifest = new Map();
      for (const rel of listTree(stage, '', { junk: true })) if (inManifest(rel)) manifest.set(rel, digestFile(path.join(stage, rel)));
      fs.writeFileSync(path.join(stage, 'MANIFEST.json'), manifestText({ app: p.version, files: manifest }));
      const expected = new Set([...files, ...p.generated, 'MARISA-PACKAGE.md', 'MOD-PACKAGE.json', 'MANIFEST.json']);
      const checked = stageProblems(stage, expected, { libsPlanned: true, env: scanEnv });
      if (checked.problems.length) throw new Error(checked.problems.join('\n'));
      // Validate the complete runtime first, then retain only additions/changes for a same-version overlay.
      // MANIFEST.json describes the resulting installation, including unchanged files inherited from vanilla.
      let shippedFiles = checked.staged;
      if (kind === 'replacement' && base) {
        const next = new Map(checked.staged.map((rel) => [rel, digestFile(path.join(stage, rel))]));
        const delta = new Set(diffBases(next, [base], { removable: () => false }).ship);
        // Vanilla player releases omit dev pages even when a source-tree base contains an identical HTML viewer.
        for (const rel of ['MANIFEST.json', 'MARISA-PACKAGE.md', 'MOD-PACKAGE.json', ...PLAYER_TEST_VIEW]) delta.add(rel);
        for (const rel of checked.staged) if (!delta.has(rel)) fs.rmSync(path.join(stage, rel));
        pruneEmptyDirectories(stage);
        shippedFiles = checked.staged.filter((rel) => delta.has(rel));
      }
      const zip = path.join(dist, name);
      fs.rmSync(zip, { force: true });
      console.log(`zipping ${kind}: ${shippedFiles.length} files`);
      zipFolder(work, zip);
      const digest = digestFile(zip);
      result.push({ name, ...digest, files: shippedFiles.length, artFiles: art.length, stage: keepStage ? stage : undefined });
      console.log(`${name}: ${digest.size} bytes; SHA256 ${digest.sha256}`);
    } finally {
      // work was created by mkdtemp within this repository's .cache/dist.
      if (!keepStage) fs.rmSync(work, { recursive: true, force: true });
    }
  }
  const publicEntries = result.map(({ stage: _stage, ...entry }) => entry);
  fs.writeFileSync(path.join(dist, 'marisa-runtime-packages.json'), `${JSON.stringify({ mod: 'marisa', version: p.version, upstream: UPSTREAM, packages: publicEntries }, null, 2)}\n`);
  fs.writeFileSync(path.join(dist, 'marisa-runtime-SHA256SUMS.txt'), result.map((entry) => `${entry.sha256}  ${entry.name}\n`).join(''));
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const baseIndex = process.argv.indexOf('--base');
  if (baseIndex !== -1 && !process.argv[baseIndex + 1]) throw new Error('--base requires the vanilla 0.2.6 ZIP or directory');
  packageMarisa({ keepStage: process.argv.includes('--keep-stage'), vanillaBase: baseIndex === -1 ? null : process.argv[baseIndex + 1] });
}
