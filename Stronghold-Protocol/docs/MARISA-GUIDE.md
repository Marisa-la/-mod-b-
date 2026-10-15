# marisa MOD 新手使用与测试说明

这份说明分为正常游玩、单场测试和开发回归。最常用的是第 4 节的鲲测试：一个命令就能放好阿戈尔队伍、触发真实吞噬并观察对空，不需要从第一回合玩起。

## 1. 先认识两个运行包和开发源码

本次交付完整包、替换包，以及随 PR 提交的开发源码。

| 包 | 你什么时候用 |
|---|---|
| `marisa-full.zip` | 全新安装；包含程序、生产依赖、前端库和当前素材 |
| `marisa-replacement.zip` | 已有**原版 0.2.6**，关闭游戏后合并覆盖；不要覆盖到旧 MOD 或其他原版版本 |
| 仓库中的 `Stronghold-Protocol/` 源码 | 修改代码、生成数据、运行完整测试；首次需要安装依赖和素材 |

运行包文件名为 `Stronghold-Protocol-0.2.6-marisa-full.zip` 和 `Stronghold-Protocol-0.2.6-marisa-replacement.zip`。解压或克隆源码后进入 `Stronghold-Protocol` 文件夹，它里面应同时看到 `package.json`、`server`、`public`、`tools`。不要把外面那层只装 ZIP 的目录当成工程目录。

完整包/替换包也带单场测试命令和回放页；只有源码包带完整自动测试文件。

## 2. 安装 Node、打开终端、启动游戏

### 2.1 Node 是什么

Node.js 是运行这个服务器和测试命令的程序。需要 Node.js 22 或更高，建议 22/24 LTS。已安装就不需要再装。

在 Windows 开始菜单打开 PowerShell，输入下面两行，每行按一次回车：

```powershell
node --version
npm.cmd --version
```

第一行能显示 `v22...` / `v24...` 等版本号，就说明 Node 可用。提示“无法识别 node”时，从 Node.js 官网安装 LTS，然后关闭旧终端、重新打开。

Windows 文档使用 `npm.cmd`，可以避免 PowerShell 对 `npm.ps1` 的脚本执行策略限制，不需要修改系统执行策略。

### 2.2 让终端进入正确目录

用资源管理器打开工程目录，在地址栏输入 `powershell` 再按回车。打开的终端会直接处于该目录。

也可以在已有 PowerShell 中运行下面示例，并把引号内的路径换成实际目录：

```powershell
Set-Location -LiteralPath 'D:\Games\Stronghold-Protocol'
Get-Item package.json
```

第二行能显示 `package.json` 才表示位置正确。后面的所有命令都在这里执行。

### 2.3 首次准备

源码包首次运行：

```powershell
npm.cmd ci
npm.cmd run setup
```

等待两个命令完成。`setup` 下载素材可能较慢，已有缓存会复用。完整包已有依赖和素材，通常可直接启动。

如果素材缺失/损坏：

```powershell
npm.cmd run setup
```

### 2.4 正常启动和停止

```powershell
npm.cmd start
```

终端保持打开，浏览器打开 `http://localhost:3000`。`localhost` 指你的这台电脑。

Windows 也可以双击 `scripts/start-windows.bat`。本机已准备的工程可双击 `.cache/start-marisa-local.cmd`。

停止服务器：回到运行服务器的终端，按 `Ctrl+C`。代码修改后要先停止再重新启动；旧浏览器页可按 `Ctrl+F5` 强制刷新。

端口 3000 被占用时：

```powershell
$env:PORT = '3001'
npm.cmd start
```

这次打开 `http://localhost:3001`。测试回放命令也要加 `--port 3001`，否则链接仍指向 3000。

## 3. 正常开启 MOD

1. 在浏览器输入名字进入大厅。
2. 展开 **MOD 管理器**。
3. 勾选 **启用魔理沙追加 MOD**。
4. 展开下方设置：已有干员逐名选择原版或 MOD；结城理和医疗阿米娅各自启用并选择商店或 V、VI 阶自选；盟约成员和鲲策略可单独配置。
5. 选择独立模拟或同盟模拟、难度，创建房间。
6. 房间会固定这份设置。加入者、观战者和重连者自动跟随，无需各自勾选。

取消勾选后创建新房间就使用原版。不能在正在进行的房间里改变规则。浏览器记住你的创建偏好，它不会更改你加入的别人的房间。

切换“魔理沙追加 MOD”不会重写游戏中已经保存的干员装备模组偏好。结城理或医疗阿米娅选择“加入自选候选名单”后，会从普通商店移出，加入 V、VI 阶 MOD 原型候选；其技能使用 MOD 默认配置，不自动携带装备模组。是否编入仍由你在自选编队中决定。同一名干员只能占一个自选位置：V 阶选了结城理，VI 阶就不能再选结城理；要改到 VI 阶，先取消 V 阶的选择。反过来也一样。

### 3.1 已有干员和追加干员如何区分

原版 0.2.6 已有**予愿安洁莉娜**和**凯尔希·思衡托**的 V、VI 阶自选候选，所以她们只在“已有干员”区出现。该区只列 MOD 实际改动过的原版干员，不会把整份原版名单都显示出来。

| 你的选择 | 实际结果 |
|---|---|
| 予愿或凯尔希选择“原版效果” | 移除对应的 MOD 新增商店棋子，保留原版自选候选、技能、装备模组规则和召唤物 |
| 予愿或凯尔希选择“魔理沙 MOD 改动” | 使用 MOD 新增商店棋子；切回原版后恢复原版自选候选 |
| 关闭“追加干员”总开关 | 结城理和医疗阿米娅都不加入；予愿和凯尔希作为已有干员，仍由各自的原版 / MOD 选择控制 |
| 单独关闭结城理或医疗阿米娅 | 只移除该干员的商店棋子或 MOD 自选候选，以及相应的新增盟约成员 |

予愿和凯尔希没有单独的“商店 / MOD 自选”路线开关。结城理、医疗阿米娅可以各自选择商店或自选；选择自选时他们的 MOD 技能与召唤物正常使用，装备模组偏好仍由游戏原有设置决定。

“追加盟约”只显示新盟约或规则本身被改动的盟约；目前只有罗德岛。原版盟约因 MOD 增加成员时，在“现有盟约追加干员”里管理。例如，结城理启用时可单独取消其在不屈盟约中的成员资格；关闭结城理后，它的盟约选项会隐藏。如果不屈下没有其他启用的新增干员，不屈条目也不会显示。没有盟约的干员使用原版“协防干员”；若你明确取消某干员加入“协防干员”，系统不会再自动把它加回。

新增内容和每项开关的效果见 [MOD 与原版全部差异](MARISA-DIFFERENCES.md)。

### 3.2 在罗德岛下选择成员

在“追加盟约”里启用罗德岛后，它下面会列出可加入的干员。勾选或取消某人只调整盟约归属，不改技能、属性和装备模组。比如先将已有干员凯尔希选为 MOD，再取消罗德岛下面的凯尔希，凯尔希就没有罗德岛归属；反过来，使用原版效果的凯尔希也可在这里明确勾选加入罗德岛。你没有操作过的成员会继续跟随该干员的原版 / MOD 选择。关闭整个罗德岛盟约会暂停全部成员资格，重新开启后恢复保存的成员选择。

## 4. 不打一整局，直接测试阿戈尔和鲲

### 4.1 准备两个终端

这里的“终端”就是一个 PowerShell 窗口。第一个窗口专门运行游戏网页服务器，第二个窗口专门生成测试战斗。服务器启动后会一直占用第一个窗口；这是正常现象，不要关掉它，也不要把测试命令输进这个没有命令提示符的窗口。

如果你已经按第 2.3 节在源码目录运行过 `npm.cmd ci` 和 `npm.cmd run setup`，按下面步骤操作。每个 PowerShell 窗口都要进入含有 `package.json` 的 `Stronghold-Protocol` 工程目录。最方便的方式是在资源管理器中打开工程目录，在地址栏输入 `powershell` 并回车；以下命令示例使用 `D:\Games\Stronghold-Protocol`，请换成你实际的目录。

**窗口一：启动网页服务器**

1. 按键盘上的 Windows 键，输入 `PowerShell`，打开“Windows PowerShell”。
2. 复制下面整段，粘贴到窗口一并按回车。先把第一行引号内的示例路径替换成实际目录；这里不需要交互输入。

```powershell
$projectDir = 'D:\Games\Stronghold-Protocol'
Set-Location -LiteralPath $projectDir
if (-not (Test-Path -LiteralPath '.\package.json')) { throw '这里没有 package.json；请检查是否选中了 Stronghold-Protocol 工程目录' }
npm.cmd start
```

3. 等待服务器启动完成。窗口会继续显示运行信息，光标不会回到 `PS ...>` 提示符；保持这个窗口开着。

**窗口二：生成测试战斗**

1. 再按一次 Windows 键，重新打开一个 PowerShell 窗口。不要关闭窗口一。
2. 复制下面整段到窗口二并按回车。第一行路径要和窗口一相同；若目录不同，只改第一行引号内的路径。

```powershell
$projectDir = 'D:\Games\Stronghold-Protocol'
Set-Location -LiteralPath $projectDir
if (-not (Test-Path -LiteralPath '.\tools\mod-test.mjs')) { throw '这里没有 tools/mod-test.mjs；请检查是否选中了当前版本的工程目录' }
node --version
node tools/mod-test.mjs --list operators | Select-String '乌尔比安|阿戈尔'
node tools/mod-test.mjs --scenario kun --operator 乌尔比安 --skill 3 --cast-at 5 --fly-at 10 --ground-at 10 --seconds 40
```

3. 先确认 `node --version` 打印出 Node 版本。`--list operators` 那行会筛出当前版本中乌尔比安和阿戈尔干员的名称、棋子 ID、技能名；最后一行会生成本机测试战斗并打印结果报告及“回放”网址。正常情况下，生成命令完成后会重新出现 `PS ...>` 提示符，窗口二可以继续使用。
4. 复制终端打印的 `回放：http://...` 整行网址，粘贴到浏览器地址栏并按回车。若你使用默认端口，网址以 `http://localhost:3000/` 开头。网页服务器由窗口一提供，窗口二只负责生成记录。

测试记录固定写入 `public/dev/recordings/mod-test.json` 和 `mod-test-report.json`。每次运行测试命令都会覆盖上一份记录；要保留上一次结果，请先把这两个文件复制到别处。测试命令本身结束后窗口二可以继续输入命令，窗口一则必须一直运行到你看完网页。

想直接测试指定干员在指定地图、指定回合出现时的表现，可在窗口二运行下面这个完整示例。地图、回合、干员和技能都可以替换；例如 `--list stages` 可查地图 ID，`--list operators` 可查棋子名称和 ID：

```powershell
node tools/mod-test.mjs --scenario wave --stage act1autochess_m01 --round 8 --difficulty HARD --operator 结城理 --skill 3 --seed 7 --seconds 90
```

`wave` 会直接构造指定地图的常规波次并放入指定干员，不需要从第一回合开始，也不包含商店购买过程。技能定时测试、鲲起飞测试和罗德岛盟约测试的现成命令见下文；这些场景各自构造单场战斗，不会改变真实房间。

看完后，在浏览器关闭回放页；回到窗口一按 `Ctrl+C` 停止服务器。不要在窗口二按 `Ctrl+C` 来停止窗口一的服务器。

如果端口 3000 已被占用，在窗口一启动前先输入 `$env:PORT = '3001'`，再运行 `npm.cmd start`；窗口二的测试命令末尾加上 `--port 3001`，然后打开它打印的 3001 回放网址。

### 4.2 生成第一段测试

复制这一整行，按回车：

```powershell
node tools/mod-test.mjs --scenario kun --operator 乌尔比安 --skill 3 --cast-at 5 --fly-at 10 --ground-at 10 --seconds 40
```

这个命令做了什么：

- `--scenario kun`：预放阿戈尔队伍和鲲策略，通过**真实阿戈尔吞噬**触发鲲，不手工给起飞标志。
- `--operator 乌尔比安`：把乌尔比安作为主测试干员。
- `--skill 3`：选择三技能；数字是玩家习惯的 S1/S2/S3，不需要减一。
- `--cast-at 5`：游戏时间到 5 秒时补足主干员技力并尝试释放选中的技能。已在释放、技能不可用等情况不会强行绕过规则。
- `--fly-at 10` / `--ground-at 10`：10 秒时添加一个飞行和一个地面训练目标，便于观察真实攻击与阻挡。
- `--seconds 40`：记录 40 秒游戏时间。回放默认按游戏的 2 倍战斗速度播放，约 20 秒现实时间。

不需要先在商店买齐角色，也不需要通关前几回合。它直接构建一场战斗，但使用同一套实际技能、伤害、盟约和渲染代码。

### 4.3 看结果，不只看图标

终端会输出结果和最后的回放地址。打开：

```text
http://localhost:3000/dev/render-demo.html?scene=mod-test&mods=marisa&board=2d
```

右上角：

- `❚❚` 暂停，`▶` 继续。
- 速度选 `0.25×` 慢看，`1×` 为正常回放速度。
- 拖动进度条直接跳到要观察的时间。
- 回放到结尾会稍等后循环；那是重播同一段记录，不是鲲又触发了一次。

生命条**右侧青色小标志**表示该干员当前实际处于起飞状态。落地后标志消失；没有起飞的干员不显示。它不会用飞行敌人的类型冒充起飞。

终端 JSON 的几个关键字段：

| 字段 | 怎么读 |
|---|---|
| `states[].liftoff: true` | 这个时间段主干员确实起飞 |
| `states[].canHitFly: true` | 当前攻击配置允许对空 |
| `revives: 3` | 此场记录到三次非移动的重新部署；鲲预置场景应出现三名被吞噬干员复活 |
| `airHits` 大于 0 | 主干员实际打中了飞行目标；比“能看到起飞特效”更直接 |
| `blockedAir` 大于 0 | 主干员确实阻挡过飞行目标 |
| `blockedGround` 大于 0 | 主干员确实阻挡过地面敌人 |
| `blockedGroundWhileAirborne` 大于 0 | 主干员起飞期间确实阻挡过地面敌人；这是检查鲲策略起飞阻挡地面的关键字段 |
| `blockedAirWhileAirborne` 大于 0 | 主干员起飞期间确实阻挡过飞行敌人 |
| `waveComposition` | 本回合整段波次计划中的地面/空中敌人数；本次 `--seconds` 截断前未必全部出场 |
| `groundHits` | 实际对地命中次数 |
| `actions[].activated` | 定时技能释放成功/未成功 |
| `errors: 0` | 模拟没有内容错误；这并不单独证明所有数值正确 |
| `states[].tile` | 主干员所在的 `[行,列]`，可观察移动 |

若 `airHits` 为 0，检查选中的技能、施放时间、攻击范围、目标位置、是否已进入不能攻击的形态；不要仅因没命中就认定起飞没有效果。

### 4.4 更容易观察的鲲测试

先不手动开技能，只看起飞后的普通攻击和空中阻挡：

```powershell
node tools/mod-test.mjs --scenario kun --operator 乌尔比安 --skill 1 --fly-at 2 --ground-at 2 --seconds 30
```

再改三技能的施放时间：

```powershell
node tools/mod-test.mjs --scenario kun --operator 乌尔比安 --skill 3 --cast-at 12 --fly-at 2 --seconds 40
```

这两段是不同实验。每次生成后刷新回放页；拖到技能施放前后，对照生命条标志、坐标与命中记录。三技能的落点和能否移动仍受敌人、占格、障碍及合法部署格限制，不会为了测试强行穿过地图。

### 4.5 用真实移动波次检查鲲起飞后的阻挡

`kun` 场景里的训练靶是静止的，只适合看吞噬、起飞和攻击，不会验证移动敌人是否被阻挡。要检查敌人经过时的真实阻挡，用 `kun-wave`：它保留鲲场景的真实吞噬起飞和阿戈尔队伍，同时生成指定回合的生产波次与路线，不额外添加训练靶。

在这个组合场景里，鲲队伍会沿用四名阿戈尔的吞噬链，但乌尔比安放在敌人行进方向最先接触的位置，其他三名队友在他身后，避免队友先挡住敌人，让报告能单独记录乌尔比安的阻挡。

例如测试绝境第 2 回合的真实移动飞行敌人：

```powershell
node tools/mod-test.mjs --scenario kun-wave --stage act1autochess_m01 --round 2 --difficulty HARD --operator 乌尔比安 --skill 1 --seed 27 --seconds 40
```

该回合生成 7 个非隐匿飞行敌人。报告中 `waveComposition.air` 和 `waveComposition.ground` 显示计划出现的飞行与地面敌人数；`blockedAirWhileAirborne`、`blockedGroundWhileAirborne` 分别统计起飞期间乌尔比安实际拦住的不同敌人数，不是接触帧数。若波次有该类敌人但阻挡数为 0，拖动回放到敌人经过的时间，核对 `states[].liftoff` 和干员所在位置。`--seconds` 应覆盖起飞和敌人经过的时间。

## 5. 换成你要的干员、地图和回合

### 5.1 查名字和 ID

```powershell
node tools/mod-test.mjs --list operators
node tools/mod-test.mjs --list operators | Select-String '安洁莉娜'
node tools/mod-test.mjs --list stages
node tools/mod-test.mjs --list waves
```

列表会给出棋子 ID、名字、技能。名字含空格或括号时加引号。医疗阿米娅为避免与其他形态混淆，建议直接用 `chess_char_1037_amiya3_a`。

`--elite` 选择精锐；也可以直接提供 `_b` ID。

### 5.2 测予愿 S3

```powershell
node tools/mod-test.mjs --scenario skill --operator 予愿安洁莉娜 --skill 3 --elite --cast-at 3 --fly-at 2 --seconds 60
```

`skill` 场景只放主干员及你额外指定的队友，不给鲲策略。这样能分清起飞来自干员技能还是鲲。

### 5.3 测结城理及换队友

```powershell
node tools/mod-test.mjs --scenario skill --operator 结城理 --skill 3 --cast-at 2 --seconds 45
node tools/mod-test.mjs --scenario skill --operator 结城理 --skill 1 --cast-at 2 --units 华法琳,chess_char_1037_amiya3_a --seconds 45
```

如果某个名字找不到，用列表查到的 ID 替代，例如：

```powershell
node tools/mod-test.mjs --scenario skill --operator chess_char_4217_makoto_a --skill 1 --cast-at 2 --units chess_char_4_26_a,chess_char_1037_amiya3_a --seconds 45
```

`--units` 以逗号分隔，最多额外 11 名；某名后加 `*` 表示精锐，比如 `华法琳*`。工具在合法部署格自动放置，不需要手工改 JSON。

### 5.4 测罗德岛治疗/反馈

```powershell
node tools/mod-test.mjs --scenario rhode --layers 100 --injure-at 2 --cast-at 3 --seconds 30
```

默认放医疗阿米娅、凯尔希·思衡托、华法琳；提供罗德岛以及同层数的另一已激活盟约，让层数上限有合法参照。`--injure-at 2` 在 2 秒时让主干员损失一半当前生命，方便看真实恢复与反馈。

这是三个在场角色的治疗/反馈实验，不冒充“四人捐献/100%效率”场景。它保留罗德岛的真实层数、治疗和伤害规则。

### 5.5 直接跑第 8 回合的实际常规波次

```powershell
node tools/mod-test.mjs --scenario wave --operator 结城理 --skill 3 --round 8 --difficulty HARD --seed 7 --seconds 90
```

`wave` 使用正常对局的波次生成函数、难度和随机种子；没有商店、收入、机变选择过程。默认不额外添加训练靶。

- `--difficulty`：`FUNNY` 标准、`NORMAL` 险境、`HARD` 绝境、`ABYSS` 终极。
- `--round`：该模式的常规回合。首领/联防不是常规波次，此命令会明确报错，不偷偷替换成其他关卡。
- `--seed`：固定随机种子，同一配置可重复比较。
- `--seconds`：记录上限 1–180 游戏秒。短时间截断不代表该回合已经通关。

这里的种子控制这一段测试；正常整局还会消耗商店、机变等随机数，因此它不是“正常对局整局种子”的直接替代。

换地图：

```powershell
node tools/mod-test.mjs --scenario wave --operator 结城理 --skill 2 --round 8 --difficulty HARD --stage act2autochess_m02 --seconds 90
```

这里“地图”是战场地形，“回合”决定波次，两者不是同一个参数。鲲预置队伍需要四个连续地面部署格；默认 `act1autochess_m01` 可以满足，其他图无法满足时会报错。

### 5.6 对照原版

```powershell
node tools/mod-test.mjs --scenario skill --operator 蒂比 --skill 2 --cast-at 2 --vanilla --seconds 35
```

`--vanilla` 读取原版数据。原版本来就能起飞的角色也显示新标志。原版没有鲲、罗德岛或四名追加商店记录，所以不能在 `--vanilla` 下使用 `kun`、`rhode` 场景或这些追加商店 ID。这不表示予愿和凯尔希在原版完全不存在；她们的原版已持有自选候选是另一种记录。

### 5.7 保存结果、生成下一次测试

```powershell
node tools/mod-test.mjs --scenario kun --operator 乌尔比安 --skill 1 --seconds 30 > kun-result.txt
```

命令退出后保存了结果。回放保存于 `public/dev/recordings/mod-test.json`，简洁结果在同目录 `mod-test-report.json`。它们是本机生成文件，不进入 Git；每次命令覆盖前一次，想保留就复制到其他目录。

命令不是服务器端“作弊聊天指令”，不会改变任何正常房间，也不会影响其他玩家。关掉服务器后它仍能生成模拟记录，但浏览器回放需要服务器提供页面和素材。

## 6. 单人测试资金：想在正常界面手动操作时

先停止当前服务器，再运行：

```powershell
$env:SP_DEV_FUNDS = '9999'
npm.cmd start
```

在大厅启用 MOD，创建**独立模拟**房间。资金模式按正常收入结算补足资金，并保留审计记录；不是任何界面都永久锁定成 9999。

它不保证商店一定刷到你要的棋子；直接指定干员请用第 4–5 节的单场测试。多人同盟（即便只有一个人/配 AI）、机器人、关闭 MOD 的房间均不补资金。

关闭资金模式：停止服务器，在同一个 PowerShell 执行：

```powershell
Remove-Item Env:SP_DEV_FUNDS -ErrorAction SilentlyContinue
npm.cmd start
```

环境变量只影响启动服务器时的配置。改完后必须重启；不要把测试资金开关当作多人 MOD 配置。

## 7. 自动测试：不需要会写代码

这些命令需要**源码包**，完整运行包没有 `test/`。

```powershell
node --test test/mod/profiles.test.js
node --test test/mod/combat-regressions.test.js
node --test test/mod/marisa_aglna2.test.js test/mod/marisa_kalts2.test.js
node --test test/render/liftoff-mark.test.js test/mod/single-battle.test.js
```

覆盖实际吞噬、复活、对空、医疗反馈、技能/形态、召唤物，以及正常/联防/首领战输入等。最后出现 `fail 0` 表示该组全部通过。

实际浏览器检查（需要 Chrome/Edge）：

```powershell
$env:SP_MOD_E2E = '1'
$env:CHROME_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
node --test test/mod/browser.e2e.test.js test/mod/liftoff.browser.test.js
Remove-Item Env:SP_MOD_E2E -ErrorAction SilentlyContinue
```

如果 Edge 不在示例位置，把路径改成你安装的 Chrome/Edge 可执行文件。测试会打开临时无头浏览器；不会要求你输入账号。测试截图在 `test/e2e/out/`。

完整检查较慢，只在准备交付或改过玩法后运行：

```powershell
$env:SP_TEST_CONCURRENCY = '2'
npm.cmd run ci
npm.cmd run golden
node tools/i18n.mjs check --all --strict
```

`golden` 是原版结果回归，不代表每一个自创 MOD 分支都覆盖；MOD 专项测试是另外一组。

## 8. 常见问题

| 现象 | 处理 |
|---|---|
| 找不到 `package.json` 或 `tools/mod-test.mjs` | 终端目录错误，返回第 2.2 节；旧运行包没有新测试工具时换本次更新后的包 |
| `node` 无法识别 | 安装 Node LTS，关闭旧终端再打开 |
| npm.ps1 被执行策略禁止 | 使用文档里的 `npm.cmd`，不必修改系统策略 |
| 浏览器打不开 localhost | 第一个终端的服务器是否还在运行？端口是否改成 3001？ |
| 提示未知干员或技能 | 用 `--list operators` 查询，技能编号从 1 开始，医疗阿米娅可直接用 ID |
| 回放是旧的一段 | 确认新命令成功完成，再刷新页面；测试文件每次覆盖 |
| 干员显示菱形/缺少模型 | 等待素材加载，或运行 `npm.cmd run setup`；模型缺失不表示战斗模拟没运行 |
| 没有起飞标志 | 先看 `states[].liftoff`；有对空能力/空中阻挡不等于起飞；确认服务器重启、页面刷新 |
| 定时技能 `activated: false` | 当时已激活、被控制、技能条件不满足等；换时间重新生成，工具不绕过可用条件 |
| 飞行目标没掉血 | 检查范围、目标距离、干员攻击形态和 `airHits`；用慢放看命中，不能只看特效 |
| 鲲场景选地图报连续地面格不足 | 先用默认 `act1autochess_m01`；这个预置必须有合法吞噬链的位置 |
| 四人罗德岛效果没出现 | 预置默认只有三个独立角色；四人在场条件和其他盟约层数上限都要满足 |
| 修改了代码但画面/结果没变化 | 停服务器 `Ctrl+C`，重启，再浏览器 `Ctrl+F5`；JSON 数据更改必须用构建工具生成 |

以后向维护者反馈时，附上：完整命令、终端结果、游戏版本、是否开启 MOD，以及看到问题的游戏时间。这样能复现同一场战斗，不必描述整局游玩过程。
