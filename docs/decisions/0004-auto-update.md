# 0004 自动更新

- 状态：已采纳
- 日期：2026-10-02
- 来源：DevHub ADR 0009

## 背景

发布流程在打 tag 后生成安装包并创建草稿 Release；已安装的应用需要知道有新版本，而不是手动下载重装。

## 决策

### 使用 electron-updater 6.8，从 GitHub Releases 更新

- electron-builder 官方配套，作为主进程运行时依赖（`dependencies`）。
- 更新源来自 `app.config.json` 的 `repository`（`owner/repo`）。未配置时不发起任何更新请求，状态显示「尚未配置更新仓库」（见 ADR 0008）。
- 支持范围：Windows（NSIS 安装版）与 Linux AppImage。deb 包由系统包管理器管理，开发版本不检查——这些情况显示原因，不提供按钮。

### 由用户决定下载与安装

- 启动 15 秒后检查一次，之后每 6 小时检查一次；**不自动下载、不在退出时自动安装**。
- 发现新版本：标题栏出现更新按钮 → 下载（显示进度）→ 重启并更新。设置页显示当前版本、状态，可手动检查。
- `quitAndInstall()` 会先执行安装再触发 `app.quit()`，不能依赖 `before-quit` 保证顺序；安装入口显式等待注入的清理函数（`core.dispose()`），失败则取消安装。
- 更新是本机能力，放在 ShellApi（`getUpdateStatus` / `checkForUpdates` / `downloadUpdate` / `installUpdate` / `onUpdateStatus`）。
- 状态转换（`main/update-status.ts`）是纯函数并有单元测试；周期性检查不会覆盖「下载中 / 已下载」的状态。

### 发布流程

- electron-builder 在 `--publish never` 下也会生成 `latest.yml` / `latest-linux.yml` 与 `.blockmap`；发布工作流把它们和安装包一起上传。
- Release 以草稿创建：已安装的应用只能看到**已发布**的 Release，所以「在 GitHub 上点发布」就是推送更新的动作。
- 不做代码签名：Windows 安装包未签名，SmartScreen 会提示；electron-updater 校验下载文件的 sha512（来自 latest.yml）。派生应用需要签名时另行决定。

## 备选与理由

- 自动下载并在退出时安装（electron-updater 默认）：用户应能选择时机。
- 自建更新服务器：没有必要，GitHub Releases 已经托管安装包。
- 只提示「有新版本」并打开下载页：仍需手动安装，体验差。

## 已知限制

- 完整的跨版本安装升级尚未实测；NSIS 会改动安装目录、注册表与快捷方式，应在 Sandbox / VM 中验证。
