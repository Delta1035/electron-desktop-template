# 0005 自制标题栏

- 状态：已采纳
- 日期：2026-10-02
- 来源：DevHub ADR 0010

## 背景

系统标题栏加上应用自己的顶栏（版本、更新提示、设置）会占用两行高度，且系统标题栏样式不跟随应用的深浅色主题。

## 决策

### Windows / Linux：`frame: false`，按钮全部自己画

- 标题栏（`features/title-bar/`）高 40px：左侧图标、产品名、版本；右侧更新提示、设置，再往右是最小化 / 最大化（还原）/ 关闭。
- 整条标题栏可拖动窗口（`.app-drag`，即 `-webkit-app-region: drag`），按钮等可点击区域用 `.app-no-drag`。
- 窗口按钮按 Windows 习惯：宽 46px，关闭按钮悬停时变红；最大化后图标切换为「还原」。
- 关闭按钮调用 `BrowserWindow.close()`，仍然经过窗口的 `close` 事件，「关闭时最小化到托盘 / 退出」的设置照常生效。
- 去掉边框后窗口设置了 `minWidth` / `minHeight`。

### macOS：`titleBarStyle: 'hiddenInset'`

- 保留系统的红绿灯按钮（平台惯例，也保留全屏、窗口贴靠等系统行为），嵌在同一条标题栏里；标题栏左侧为红绿灯留出空位，全屏时不留。macOS 不是已验证平台。

### 接口

- 窗口控制是本机能力，放在 ShellApi：`getWindowState` / `onWindowState`（最大化、全屏变化时推送，带 `platform`）/ `minimizeWindow` / `toggleMaximizeWindow` / `closeWindow`。处理器在 `main/window-controls.ts`，作用于发起调用的窗口。

## 备选与理由

- Windows 上用 `titleBarOverlay`（系统按钮叠在自制标题栏上）：能保留 Win11 悬停最大化按钮时的贴靠布局菜单，但按钮样式只能有限定制，Linux 上表现也不一致。
- macOS 也画自己的按钮：违背平台习惯，且要自己处理全屏等行为。

## 已知限制

- 失去 Win11 悬停最大化按钮时的贴靠布局菜单（拖到屏幕边缘、Win+方向键贴靠仍然可用）。
- Linux 上去掉边框后，边缘调整大小、双击标题栏最大化取决于窗口管理器。CI 的 xvfb 没有窗口管理器，Linux 上的窗口行为需在真实桌面环境验证。
