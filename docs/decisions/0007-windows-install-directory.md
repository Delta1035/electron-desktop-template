# 0007 Windows 安装目录

- 状态：已采纳
- 日期：2026-10-03
- 来源：DevHub ADR 0014

## 背景

一键安装不允许选择位置。用户希望安装时指定目录，并自动创建以应用命名的子文件夹，避免应用文件散落在所选目录中。

## 决策

- 使用 electron-builder 的 NSIS 安装向导（`oneClick: false`），用 NSIS 自带 nsDialogs 实现目录选择页，不引入依赖。
- 子文件夹名为 `app.config.json` 的 projectName。NSIS 无法读取 JSON，打包时由 `electron-builder.config.mjs` 生成 `build/generated/installer.nsh`，只定义 `APP_INSTALL_DIR_NAME` 并 include 静态的 `build/installer.nsh`（见 ADR 0008）。
- 浏览选择后立即在输入框显示规范化路径；手动输入实时显示最终目录预览，离开目录页时提交同一路径。原生目录页只在开始安装时追加路径，不能清楚表达实际目标，因此替换该页，保留其他上游安装流程。
- 新选目录的最后一级不是该子文件夹名时追加；Windows 下大小写不敏感，已有同名尾目录不重复追加。静默安装同样规范化。
- 保留已有安装位置，即使旧位置不以该名称结尾，避免升级迁移或形成嵌套目录。自动更新继续使用上游注册表与静默安装流程。
- 通过 NSIS include 宏扩展上游模板，不替换整个安装器。
- 只影响 Windows 安装包；Linux 的 AppImage / deb 沿用原有分发方式。

## 验证

构建真实 Windows 安装包，检查自定义 NSIS 回调与路径规则；安装向导交互与跨版本自动更新需要实际安装场景验证。
