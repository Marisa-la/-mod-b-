# 魔理沙追加 MOD · Stronghold-Protocol 0.3.0

四名干员、罗德岛、鲲、自选候选、皮肤与单场回放已迁入 0.3.0 原生插件系统。用户已完成本机游玩测试。

- [下载完整包、兼容替换包、插件及 SHA256](https://github.com/Ruyl114514/marisa-s-mod/releases/tag/marisa-0.3.0-20261016)
- [安装、管理器入口、兼容范围与开发说明](Stronghold-Protocol/docs/MARISA-0.3.0.md)

Windows 完整包双击 scripts/start-marisa.cmd。创建房间后点击顶部“插件”，开启“魔理沙追加 MOD”并应用设置。再次启动会复用运行中的服务，避免 3000 端口冲突。插件单独安装需要本版兼容补丁；完整包和替换包已包含补丁。

从源码运行：进入 Stronghold-Protocol，执行 npm ci，将 mods/marisa-native/bundle/marisa 复制到 plugins/marisa，再运行 scripts/start-marisa.cmd。首次素材准备参照工程 README 与 MOD 安装说明。

原版基线为 sganggs/Stronghold-Protocol v0.3.0（c24e17eec3af1e6dedfa9935a6d15245cf2f4586）。保留根目录原有许可证；Stronghold-Protocol/ 程序遵循其中 GPL-3.0-or-later 与 NOTICE，根许可证不替代上游许可。游戏美术不提交 Git，仅随非商业同人运行附件提供。本次适配与文档使用 AI 辅助。

## 原项目说明（保留）

# 魔理沙的卫戍协议盟约mod追加
针对卫戍协议盟约的系内容追加，mod添加
本mod基于ausevay大佬的卫戍协议盟约开发，大家可以去点一个star，源网址：https://github.com/sganggs/Stronghold-Protocol
本mod添加内容

1，新增干员结成理及其皮肤

2，新增罗德岛盟约，为干员提供治疗加成和受治疗反伤，具体效果见游戏内说明

3，新增策略鲲，加强了阿戈尔的对空，当阿戈尔吞噬3名以上干员时，起飞，阻挡攻击空中单位，并复活吞噬干员
