# 架构决策记录（ADR）

每个重要决策一个文件：`NNNN-简短标题.md`，包含：状态、日期、背景、决策、备选与理由。
被推翻的决策不删除，标记为「已被 NNNN 取代」。以下记录改编自来源应用 DevHub 的 ADR，保留原决策日期。

- [0001 技术栈](0001-tech-stack.md) — Electron + electron-vite、React 19、Tailwind v4 + shadcn/ui、Zod、Vitest / Playwright 及依赖放置约定
- [0002 本地持久化：JSON 文件](0002-local-storage.md) — zod 校验的 JSON 文件、损坏备份、原子写入与串行读改写
- [0003 设置与主题](0003-settings.md) — closeAction 存 settings.json，主题存 localStorage
- [0004 自动更新](0004-auto-update.md) — electron-updater 从 GitHub Releases 更新，由用户决定下载与安装
- [0005 自制标题栏](0005-custom-title-bar.md) — Windows / Linux 无边框自绘按钮，macOS 保留红绿灯
- [0006 依赖审计报告](0006-dependency-audit.md) — CI 报告模式审计全部依赖，不阻断、不豁免
- [0007 Windows 安装目录](0007-windows-install-directory.md) — NSIS 安装向导自动追加以 projectName 命名的子目录
- [0008 产品标识与初始化](0008-product-identity.md) — app.config.json 唯一标识来源、`pnpm initialize` 与标识检查
