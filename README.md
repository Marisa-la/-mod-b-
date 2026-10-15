# 魔理沙追加 MOD · Stronghold-Protocol 0.2.6

本次将旧 0.2.4 替换包的可读 JavaScript 增量迁移到上游 0.2.6，提供可维护源码、按房间配置的 MOD 管理器、完整运行包和替换包。默认使用原版；启用后加入者、观战者与重连者跟随房主的规则。

- [完整包、替换包和 SHA256](https://github.com/Ruyl114514/marisa-s-mod/releases/tag/marisa-0.2.6-20261015-fix1)
- [玩家使用与测试教程](Stronghold-Protocol/docs/MARISA-GUIDE.md)
- [开发者使用手册（AI 生成）](Stronghold-Protocol/docs/MARISA-DEVELOPER.md)
- [完整差异清单](Stronghold-Protocol/docs/MARISA-DIFFERENCES.md)
- [维护与验证记录](Stronghold-Protocol/docs/MODS.md)
- [安装包说明](Stronghold-Protocol/docs/MARISA-PACKAGES.md)

## 主要内容

1. 保留结城理、医疗阿米娅、予愿安洁莉娜和凯尔希·思衡托的 MOD 商店记录、技能、召唤物和驻防。后两名在原版 0.2.6 已有自选候选，管理器归为已有干员。
2. 保留罗德岛、鲲策略、皮肤与形态动画、单人测试资金，修复反馈递归、重复结算、技能及召唤物生命周期等问题。
3. 管理器可配置已有干员的原版/MOD 效果、两名追加干员的启停和商店/V/VI 自选路线、盟约及逐人成员、鲲策略。V/VI 同一追加角色只能编入一个位置，盟约显式成员选择优先于干员模式。干员装备模组由游戏原有界面配置。
4. 生命条旁增加起飞标志。单场测试与回放支持 `kun-wave` 真实吞噬和移动波次，无需打一整局。
5. 完整源码在 `Stronghold-Protocol/`。运行包排除项目测试、开发依赖、缓存和本机配置；游戏美术只随运行附件提供，不进入 Git。

## 从源码启动

需要 Node.js 22 或更新版本。在仓库目录的 PowerShell 逐行运行：

```powershell
Set-Location Stronghold-Protocol
npm.cmd ci
npm.cmd run setup
npm.cmd start
```

打开 `http://localhost:3000`。完整包可双击 `scripts/start-windows.bat`。替换包只合并覆盖原版 0.2.6，覆盖前停止服务并备份；旧 MOD 或其他版本使用完整包装到新目录。

## 来源、许可和 AI 说明

上游：[sganggs/Stronghold-Protocol](https://github.com/sganggs/Stronghold-Protocol)，基线 `488db49f11daf862b67ce26fa4cf89aa6cba2466`。原 MOD 作者为 Marisa-la，下方保留原项目说明。`Stronghold-Protocol/` 代码遵循其 [GPL-3.0-or-later 许可证](Stronghold-Protocol/LICENSE)；根目录原有 Apache-2.0 许可证保持不变，不替代上游代码许可证。游戏美术归原权利人，限非商业同人，见 [NOTICE](Stronghold-Protocol/NOTICE.md)。

开发者手册由 **OpenAI Codex（AI）生成**，代码迁移与文档整理使用了 AI 辅助。用户已完成本机手动游玩测试，自动验证范围及局限详见维护记录。


---

## 原项目说明（保留）

# 魔理沙的卫戍协议盟约mod追加
针对卫戍协议盟约的系内容追加，mod添加
本mod基于ausevay大佬的卫戍协议盟约开发，大家可以去点一个star，源网址：https://github.com/sganggs/Stronghold-Protocol
本mod添加内容

1，新增干员结成理及其皮肤

2，新增罗德岛盟约，为干员提供治疗加成和受治疗反伤，具体效果见游戏内说明

3，新增策略鲲，加强了阿戈尔的对空，当阿戈尔吞噬3名以上干员时，起飞，阻挡攻击空中单位，并复活吞噬干员
