# 0001 技术栈

- 状态：已采纳
- 日期：2026-10-02
- 来源：DevHub ADR 0001

## 背景

模板面向 Windows / Ubuntu 桌面应用，希望技术栈主流、生态成熟，全程使用 TypeScript，并适合 AI 协作开发。

## 决策

全栈 TypeScript：

| 领域       | 选择                                                                 |
| ---------- | -------------------------------------------------------------------- |
| 桌面框架   | Electron 44 + electron-vite 5（Vite 7）                              |
| UI         | React 19 + Tailwind CSS v4 + shadcn/ui（Radix、Lucide）              |
| 服务端状态 | TanStack Query 5                                                     |
| 校验       | Zod 4                                                                |
| 测试       | Vitest 5；E2E 用 Playwright 1.63                                     |
| 打包与更新 | electron-builder 26、electron-updater 6.8                            |
| 工程化     | pnpm workspace、ESLint 9、Prettier 3、TypeScript 6.0、GitHub Actions |
| 提交钩子   | husky 9 + lint-staged 17（提交前格式化并 lint 暂存文件）             |

版本约束：TypeScript 6.0 需与 typescript-eslint 兼容，ESLint 9、Vite 7（electron-vite 5 要求）。升级前先确认生态兼容。

## 备选与理由

- Tauri 2 + Rust：更轻量，但生态较小，且需要 Rust 工具链。
- Wails + Go：小众，移动端无成熟路径。
- Electron 的内存开销可接受。
- 暂不引入 Turborepo：只有两个包时 `pnpm -r` 足够。

## 补充：UI 与依赖放置

- shadcn/ui 使用 `radix-nova` 风格（Radix + Lucide 图标 + Geist 字体）。CLI 无法自动识别 electron-vite，因此手动维护 `apps/desktop/components.json`；在 `apps/desktop` 下用 `pnpm dlx shadcn@latest add <组件>` 添加组件。
- 使用 shadcn 官方的 `cn` 包（替代 `clsx + tailwind-merge`）。该包仍是 0.x，升级时留意变更。
- 被 Vite 打包进 renderer 的库一律放 `devDependencies`；`dependencies` 只放主进程运行时需要的包（electron-builder 会把它们打进安装包），目前为 `@electron-toolkit/utils` 与 `electron-updater`。

## 补充：E2E 的做法

- `@playwright/test` 的 `_electron.launch` 驱动**构建产物**：启动应用目录（经 `main` 进入 `out/main/index.js`，这样 `app.getVersion()` 读到的是应用版本），不依赖 dev server，也不需要下载浏览器。
- 每个测试独立的 `--user-data-dir`：隔离数据文件和单实例锁，不影响本机运行的应用。
- 原生对话框在主进程中用 `electronApp.evaluate` 替换，其余流程走真实 UI。
- 不放进 `pnpm check`（需构建 + 启动 Electron，较慢）；CI 在 Windows 与 Ubuntu（`xvfb-run`）上每次运行，失败时上传 trace。
- Linux CI 上加 `--no-sandbox`：GitHub 的 Ubuntu runner 无法配置 Chromium 的 SUID 沙箱。
