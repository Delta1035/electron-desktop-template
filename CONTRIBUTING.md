# 参与贡献

感谢你愿意改进这个模板！提交问题和 PR 都欢迎。项目文档使用中文，Issue / PR 用中文或英文均可。

> 用模板创建了自己的应用？这份指南同样适用，按需改写即可。

## 报告问题与建议

- Bug：用「Bug 报告」模板，写明系统、复现步骤，以及是否已运行 `pnpm initialize`。
- 新功能：用「功能建议」模板，先描述要解决的问题，再说想要的做法。模板只收录通用能力，具体产品功能请放在自己的应用里。
- 先看一眼 [进度](docs/PROGRESS.md)，问题可能已经记录。

## 开发环境

需要 Node.js ≥ 22、pnpm 11，Windows 或 Linux。

```bash
pnpm install --frozen-lockfile
pnpm dev      # 启动桌面端（热更新）
pnpm check    # 格式 + lint + 类型 + 单测 + 标识检查
pnpm e2e      # 构建并用 Playwright 驱动真实应用
```

安装依赖时会启用 git 钩子：提交前自动对暂存的文件运行 Prettier 与 ESLint（husky + lint-staged）。

在 VS Code 集成终端中运行 `pnpm dev` / `pnpm e2e` 前需清除 `ELECTRON_RUN_AS_NODE`，例如 `env -u ELECTRON_RUN_AS_NODE pnpm dev`。

## 目录结构

```
apps/desktop/
  src/main/core/   核心逻辑（便签、设置…），不依赖 Electron
  src/main/        Electron 主进程：窗口、托盘、更新、IPC 自动映射
  src/preload/     暴露类型化 API
  src/renderer/    React UI，只通过 @renderer/api 访问核心
  e2e/             Playwright 用例
packages/shared/   平台无关的 API 契约与 zod schema
scripts/           初始化、标识检查、打包配置与产物校验
app.config.json    产品标识的唯一来源
docs/              架构、进度与示例删除说明
```

动手前请先读 [架构](docs/ARCHITECTURE.md)；完整约定见 [AGENTS.md](AGENTS.md)，要点如下：

- renderer 只能通过 `@renderer/api` 访问核心；`src/main/core/` 与 `packages/shared/` 不得依赖 Electron。这些边界由 ESLint 强制，不要禁用规则。
- 新增 API 同时修改 `AppApi` 与 `appApiMethods`，IPC 与 preload 会自动映射。
- 外部输入在 core 中用 zod 校验；核心改动必须有行为测试。
- 产品名、appId、仓库只写在 `app.config.json`（用 `pnpm initialize` 修改），不要硬编码到源码或打包配置。
- 单文件不超过 400 行；不使用 `any`、`@ts-ignore` 或禁用规则。
- 引入新依赖前先在 Issue 中说明理由。

## 提交 PR

1. 从 `main` 拉分支，一个 PR 只做一件事。
2. `pnpm check` 必须通过；改动 UI、IPC/preload 或生命周期时还要跑 `pnpm e2e`。CI 会在 Windows 与 Ubuntu 上重复这两项，并打包校验真实产物。
3. 提交信息使用 [Conventional Commits](https://www.conventionalcommits.org/)（`feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`），正文说明「为什么」。
4. 改了结构或约定时同步更新 `docs/ARCHITECTURE.md`。

## 许可

提交贡献即表示你同意以 [MIT](LICENSE) 许可发布你的代码。
