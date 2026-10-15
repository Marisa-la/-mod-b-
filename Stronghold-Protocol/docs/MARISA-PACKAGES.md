# marisa MOD 0.2.6 安装包

本次提供完整包和替换包两种 ZIP。包内统一只有 `Stronghold-Protocol/` 目录；开发源码直接随 PR 提交，Node.js 22 或更新版本需要自行安装。

| 文件 | 适用场景 | 内容 |
|---|---|---|
| `Stronghold-Protocol-0.2.6-marisa-replacement.zip` | 已安装原版 0.2.6 | 对照原版完整包，仅含新增或改变的运行程序、数据、依赖、前端库和素材 |
| `Stronghold-Protocol-0.2.6-marisa-full.zip` | 全新安装 | 上述内容与当前素材清单所列全部素材、字体 |

开发者手册见 [MARISA-DEVELOPER.md](MARISA-DEVELOPER.md)，已注明由 AI 生成；只随源码提供，不占用玩家运行包空间。

替换包适用于上游 `488db49f11daf862b67ce26fa4cf89aa6cba2466`（0.2.6）。关闭服务器并备份安装目录，先确认原版启动完成过，没有待应用的 `UPDATE.json`。将 ZIP 内目录的内容合并进原安装，覆盖同名文件，保留原素材。它是同版本手动覆盖包，不使用上游跨版本更新协议，因此不提供 `UPDATE.json`，也不自动删除玩家文件。不适用于旧版 marisa 替换包或其他原版版本；这些情况使用完整包解压到新目录。

完整包解压到新目录即可。运行依赖与前端库已经准备好；可选的官方本地 3D 战场提取素材未包含，棋盘会使用默认显示。Windows 双击 `scripts/start-windows.bat`，其他系统运行 `npm start`。大厅 MOD 管理器默认关闭，房主勾选后创建房间，其他玩家跟随房间配置。

从源码重建：先安装依赖，生成 MOD 数据，准备素材与 vendor，再运行：

```sh
npm ci
npm run build:mod
node tools/fetch-assets.mjs
node tools/vendor.mjs
node tools/package-marisa.mjs --base /path/to/Stronghold-Protocol-v0.2.6.zip
```

将 `--base` 路径替换为实际原版 0.2.6 完整 ZIP，也可传未修改的原版安装目录。构建器先检查完整运行目录，再按摘要移除替换包中可从原版继承的相同文件；未提供 `--base` 时兼容原先整套运行程序覆盖的方式。生成物位于 `.cache/dist/`。构建会校验已有生产依赖与 `package-lock.json` 版本一致，只复制非开发依赖；不会修改本机依赖。每个运行 ZIP 内有 `MOD-PACKAGE.json`、安装说明 `MARISA-PACKAGE.md` 与程序 SHA256 清单 `MANIFEST.json`，替换包清单描述合并后的完整程序。包外 `marisa-runtime-packages.json` 记录尺寸和文件数，`marisa-runtime-SHA256SUMS.txt` 记录整个 ZIP 的 SHA256。构建器拒绝缺失素材、未解析的运行导入和机器主目录路径；纯数字账户名不做裸子串匹配，以避免把官方 three.js 数值表误认为个人信息。

源码和构建脚本进入 Git，ZIP、美术、字体和依赖留在忽略目录。完整 ZIP 超过 GitHub 单文件 Git 大小限制，应作为 Release 附件上传，PR 中链接附件并附校验清单。保留 `LICENSE`、`NOTICE.md` 和原作者来源说明，素材归原权利人，仅用于非商业同人。

完整功能、规则差异和验证记录见 [MODS.md](MODS.md)。
