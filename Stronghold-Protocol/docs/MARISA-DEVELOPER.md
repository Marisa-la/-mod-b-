# 魔理沙追加 MOD 开发者使用手册

> **AI 生成说明：本手册由 OpenAI Codex 根据当前仓库代码、用户需求和实际验证记录生成。用户已完成手动游玩测试；手册不代表原 MOD 作者或上游作者审定。**

## 1. 版本、来源和目录

目标为 Stronghold-Protocol **0.2.6**，上游基线为 `488db49f11daf862b67ce26fa4cf89aa6cba2466`。旧魔理沙替换包基于 0.2.4，其中保留可读 JavaScript；本次提取其增量并迁移，没有覆盖新版整包。

- 上游：[sganggs/Stronghold-Protocol](https://github.com/sganggs/Stronghold-Protocol)。
- 原 MOD：[Marisa-la/marisa-s-mod](https://github.com/Marisa-la/marisa-s-mod)。
- 原始文件摘要与来源：[mods/marisa/provenance.json](../mods/marisa/provenance.json)。
- 自创玩法配置：[mods/marisa/content.json](../mods/marisa/content.json)。
- 逐项变化：[MARISA-DIFFERENCES.md](MARISA-DIFFERENCES.md)；玩家操作与双终端教程：[MARISA-GUIDE.md](MARISA-GUIDE.md)。

在 marisa-s-mod 仓库中，可运行源码位于 `Stronghold-Protocol/` 子目录。以下命令均在该子目录中执行。保留上游 GPL-3.0-or-later 的 `LICENSE`、`NOTICE.md` 与第三方声明；仓库根目录的原有许可证不替代子目录中上游代码的许可证。游戏美术归原权利人，不提交到 Git，仅用于非商业同人。

## 2. 安装与启动

需要 Node.js 22 或更新版本。Windows 中，用资源管理器打开含 `package.json` 的工程目录，在地址栏输入 `powershell` 并回车，再执行：

```powershell
npm.cmd ci
npm.cmd run setup
npm.cmd start
```

`setup` 准备前端库和素材，可能下载较多文件。服务默认位于 `http://localhost:3000`。保持服务器窗口开启；停止时按 `Ctrl+C`。完整运行包已含生产依赖和当前素材，直接运行 `scripts/start-windows.bat` 即可。

大厅展开“MOD 管理器”，勾选“启用魔理沙追加 MOD”后才显示配置；总开关默认关闭。房主创建房间时确定规则，加入者、观战者、重连者使用同一份配置。取消启用会隐藏选项，已保存的选择仍保留。分类和原版盟约成员列表可分别折叠。

## 3. 修改应从哪里开始

| 工作 | 入口 |
|---|---|
| 角色阶级、价格、默认技能、追加归属和皮肤配置 | `mods/marisa/content.json`、`tools/build-data.mjs`、`tools/mod-content.mjs` |
| 房间开关、选项校验、成员优先级、玩法数据合成和内容标识 | `shared/mods.js`、`server/mods.js` |
| 房间创建、加入、观战、重连与网络校验 | `server/lobby.js`、`shared/protocol.js` |
| 管理器界面及持久化 | `public/js/screens/lobby.js`、`public/css/screens/lobby.css` |
| V、VI 阶候选、同角色互斥及装备模组 | `shared/diy.js`、`public/js/ui/diyModel.js`、`public/js/ui/loadoutSync.js` |
| 四名商店角色技能 | `server/sim/content/kits/ops/op-makoto.js`、`op-amiya3.js`、`mod-aglna2.js`、`mod-kalts2.js` |
| 罗德岛整备期与战斗规则 | `server/match/rhodeMeta.js`、`server/sim/content/bonds/addon/battle.js` |
| 鲲吞噬、起飞及复活 | `server/sim/content/bands/battle.js` |
| 起飞状态与生命条标志 | `server/sim/snapshot.js`、`shared/constants.js`、`public/js/render/units.js` |
| 皮肤与形态动画 | `public/js/ui/skinModel.js`、`public/js/render/textures.js`、`units.js`、`fx/kinds.js` |
| 单人测试资金 | `server/match/devMode.js`、`server/match/player/round.js` |
| 单场命令与回放 | `tools/mod-test.mjs`、`public/dev/render-demo.js` |
| 两种运行包 | `tools/package-marisa.mjs`；基础白名单与运行校验在 `tools/package.mjs` |

数据合成由服务端与浏览器共用。不要在浏览器额外实现一份盟约筛选，否则内容哈希和模拟结果可能不一致。战斗模拟必须保持纯 ESM、确定性；不用 Node API、系统时间或 `Math.random`。详细接口见 [ARCHITECTURE.md](ARCHITECTURE.md)、[SIM.md](SIM.md)、[META.md](META.md)、[DATA.md](DATA.md)。

## 4. 管理器选项和优先级

以下是 `modOptions` 的完整默认结构。`mods: ['marisa']` 决定是否启用扩展；`modOptions` 只决定扩展内的内容。

```json
{
  "existing": { "enabled": true, "vanillaChars": [] },
  "additions": { "enabled": true, "disabledChars": [], "diyChars": [] },
  "bonds": { "enabled": true, "disabledIds": [], "memberOverrides": {} },
  "existingBondMembers": { "disabledIds": [] },
  "strategies": { "enabled": true, "disabledIds": [] }
}
```

- `existing.vanillaChars`：切回原版的已有干员 ID。只列实际被改动的角色。予愿安洁莉娜、凯尔希·思衡托属于已有干员；切回原版移除普通和精锐 MOD 商店记录，恢复原版自选候选、技能、装备模组及召唤物。
- `additions.disabledChars`：停用结城理或医疗阿米娅；它们的商店/候选和新增成员资格同时移除。
- `additions.diyChars`：将启用的追加干员改为 V、VI 阶自选候选，退出普通商店池；同一角色跨两阶合计只能编入一个位置。
- `existingBondMembers.disabledIds`：逐项退出原版盟约的新增成员，键为 `盟约ID:干员ID`。仅增加成员不等于新增盟约；选项根据启用的干员动态显示。角色停用再启用时保留原有成员选择。
- `bonds.disabledIds`：关闭整个新增盟约，当前仅有 `rhodeShip`（罗德岛）。
- `bonds.memberOverrides`：显式的新增盟约成员选择。比如 `"rhodeShip:char_003_kalts": false` 会让凯尔希即便选择 MOD 模式也不加入罗德岛；`true` 可为原版模式添加该归属，只改变成员资格。
- `strategies.disabledIds`：关闭新增策略，当前仅有 `band_kun`（鲲）。

优先级：扩展总开关 → 分类/整个盟约开关 → 明确成员选择 → 干员原版/MOD 模式的默认归属。整个盟约关闭后，成员 `true` 也不能使其生效；缺少明确选择时跟随干员模式。停用的真正追加干员不因成员选项重新出现。没有其他归属时通常回退“协防干员”；明确退出协防干员的成员不被自动加回。当前没有“空想”盟约。

选项由 `validModOptions` 校验、`normalizeModOptions` 排序去重，并纳入房间内容哈希。老客户端不提交子选项时使用完整 MOD 默认配置。魔理沙 MOD 与游戏里的干员装备模组是两个独立设置；不要借切换扩展改写玩家的装备模组偏好。

## 5. 修改数据和素材

生成的 `data/*.json` 和 `data/mods/marisa/*.json` 不手改。官方数值来自缓存的官方表；自创获取方式、盟约和驻防来自旧包与明确配置。修改后生成：

```powershell
node tools/build-data.mjs --offline
node tools/build-data.mjs --mod marisa --out data/mods/marisa --offline
node tools/mod-diff.mjs
```

`--offline` 要求已有 `.cache/gamedata/excel/`；首次没有缓存时去掉它，由工具下载数据。普通/精锐、自选候选、召唤物变体和四个翻译包应一起检查。皮肤和动作素材通过 `setup` 获取；缺失时回退默认显示，不提交 `public/assets/`、`public/fonts/` 或下载缓存。

## 6. 单场测试与可复制命令

另开一个位于同一工程目录的 PowerShell，保留第一个窗口的服务器。下列命令调用真实战斗模拟并写入本地回放，不经过商店和前序回合。默认使用完整 MOD 数据，不自动读取大厅中保存的个性化管理器配置；管理器组合用专项测试和真实房间验证。

查看可用内容：

```powershell
node tools/mod-test.mjs --help
node tools/mod-test.mjs --list operators
node tools/mod-test.mjs --list stages
```

鲲起飞与真实移动飞行敌人（“简单问题”任务新增）：

```powershell
node tools/mod-test.mjs --scenario kun-wave --stage act1autochess_m01 --round 2 --difficulty HARD --operator 乌尔比安 --skill 1 --seed 27 --seconds 40
```

该例是 7 个非隐匿飞行敌人、0 个地面敌人的真实波次。`waveComposition` 是计划数量；`blockedAirWhileAirborne` 和 `blockedGroundWhileAirborne` 是主干员起飞期间实际阻挡的不同敌人数，`airHits`/`groundHits` 是命中次数。此例地面计数为 0 不能证明地面阻挡能力。观察地面阻挡时需选择包含移动地面敌人的其他波次，并确认它确实经过干员位置。组合场景预置吞噬链站位，默认地图已验证，不能保证任意地图都有合适部署格。主干员过早倒下时工具会报错，可换较早波次或缩短记录时长。

指定关卡与技能、检查医疗与形态：

```powershell
node tools/mod-test.mjs --scenario wave --stage act1autochess_m01 --round 8 --difficulty HARD --operator 结城理 --skill 3 --seed 7 --seconds 40
node tools/mod-test.mjs --scenario skill --operator 予愿安洁莉娜 --skill 3 --cast-at 3 --seconds 40
node tools/mod-test.mjs --scenario rhode --layers 100 --injure-at 2 --cast-at 3 --seconds 30
```

打开命令最后打印的回放链接。每次生成覆盖 `public/dev/recordings/mod-test.json` 和 `mod-test-report.json`，保留旧实验请先复制这两个文件。修改命令后刷新回放页；`--port 3001` 只修改链接，服务器端口另由启动窗口的 `$env:PORT = '3001'` 设置。

`kun` 是静止训练靶场景，`wave` 是不带鲲的实际波次，`kun-wave` 组合实际吞噬起飞与波次；后两者不添加 `--fly-at`/`--ground-at` 训练靶。`--cast-at` 补技力后尝试正常开技能，不绕过技能可用条件。乌尔比安 S3 发生移动/重新部署时清除本次鲲起飞的现有表现予以保留。

在正常单人界面补测试资金：停止服务器，在服务器窗口执行以下命令后重新启动；只补单人人类玩家、启用 MOD 的独立模拟资金，经正常收入和审计流程入账：

```powershell
$env:SP_DEV_FUNDS = '9999'
npm.cmd start
```

关闭时先按 `Ctrl+C`，执行 `Remove-Item Env:SP_DEV_FUNDS -ErrorAction SilentlyContinue`，再启动。

## 7. 按改动范围验证

管理器、房间与单场测试的常用检查：

```powershell
node --test test/mod/manager.test.js test/mod/profiles.test.js test/mod/single-battle.test.js
node --test test/mod/combat-regressions.test.js test/mod/marisa_aglna2.test.js test/mod/marisa_kalts2.test.js
node tools/i18n.mjs check --all --strict
node --test test/docs-consistency.test.js test/docs-paths.test.js
```

修改界面时按需启用真实浏览器检查：

```powershell
$env:SP_MOD_E2E = '1'
$env:CHROME_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
node --test test/mod/browser.e2e.test.js test/mod/liftoff.browser.test.js
Remove-Item Env:SP_MOD_E2E -ErrorAction SilentlyContinue
```

准备交付时运行 `npm.cmd run ci` 和 `npm.cmd run golden`。已有验证记录见 [MODS.md](MODS.md)；不要把一次旧结果写成当前重新通过。当前 golden 的 8 项预期起飞快照变化记录在 [test/golden/README.md](../test/golden/README.md)，其余变化必须调查。没有证据的自创细节标注 `[ASSUMED]`，不能用旧包声称“已通过”代替实际结果。

## 8. 打包、提交与同步

只生成完整包与替换包，开发源码直接随 PR 提交，不必额外制作源码 ZIP。依赖和素材准备好后，用原版 0.2.6 完整 ZIP 作为对照：

```powershell
node tools/package-marisa.mjs --base 'D:\Releases\Stronghold-Protocol-v0.2.6.zip'
```

把示例路径换成实际原版完整 ZIP。`--base` 也接受未修改的原版安装目录。完整包只复制运行白名单、生产依赖、前端库和引用素材；替换包先校验完整运行目录，再与原版按文件摘要对比，只保留新增/改变的文件。未指定 `--base` 时保留兼容的整套运行文件覆盖方式。输出、SHA256 和文件统计均在 `.cache/dist/`；不要把 ZIP 或游戏美术加入 Git。

替换包只覆盖原版 0.2.6，不能直接覆盖旧 MOD。覆盖前停止服务、备份，并确认没有待应用的 `UPDATE.json`。合并覆盖后重启、浏览器强制刷新。完整包解压到新目录使用。替换包的 `MANIFEST.json` 描述合并完成后的程序，包括从原版继承的未修改文件；不会自动删除玩家文件。

同步上游时先保留当前可复现提交，再引入上游改动；重新比较原版和 MOD 数据，检查已有干员与新干员的分类、召唤物变体、素材地址、协议校验、浏览器缓存与哈希，再按受影响范围验证。不要重新用 0.2.4 整包覆盖新版本。PR 说明应列明来源、行为差异、推断项、测试摘要和 golden 变化，保持原作者说明及非商业用途约束。
