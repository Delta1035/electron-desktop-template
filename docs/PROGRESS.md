# 进度

当前：初始化、打包与 CI/发布配置已完成，Windows 验证通过；Linux 与远端 CI 尚未运行。

已提取应用外壳、通信、安全、存储、事件、设置、主题、更新及便签示例；中性图标与生成脚本可用。

初始化与交付：`pnpm initialize` 预览后写入三个标识文件，可重复执行、写入失败时回滚、拒绝非模板目录与 appId 静默变更。打包配置、NSIS 安装子目录、窗口标题与更新源均从 app.config.json 读取；`pnpm identity` 检查一致性与来源残留，发布模式另外要求非默认标识与匹配的仓库。新增 CI（审计、两平台 check+E2E、两平台真实打包与产物校验）、release 与 dependabot。

验证（Windows）：pnpm check 通过（脚本 31、desktop 45、shared 2 个测试）；默认配置及两组产品配置（中文名并配置仓库、ASCII 名称且无仓库）均通过 check 与 E2E 3/3，Windows 安装包/免安装包名称、可执行文件、更新源（含无仓库时不生成）与产物校验一致，打包版能启动且标题正确。

远端 CI（首次推送 `f4893c6`）：Ubuntu check、两平台打包与依赖审计通过；Windows check 失败，因缺少 `.gitattributes`，Windows 检出为 CRLF，Prettier 报 96 个文件格式问题。

仓库门面与基础文件（2026-10-03，同步自 DevHub）：新增 `.gitattributes`（统一 LF，修复上述 CI 失败）、`.editorconfig`、`CLAUDE.md`；MIT `LICENSE`（版权人 Delta1035）；英文 README + `README.zh-CN.md`（徽章、截图、Star History）；`CONTRIBUTING.md`；Issue 表单与 PR 模板。截图 `docs/assets/` 用临时 Playwright 脚本截取，未保留脚本。

工程化补齐（2026-10-03）：提交前 husky + lint-staged 格式化与 lint 暂存文件；Claude Code 钩子（编辑后格式化、结束前跑 typecheck + test）；`docs/decisions/` 新增 8 篇 ADR（改编自 DevHub，代码注释中的 ADR 编号已同步为新编号）。GitHub 仓库已标记为模板仓库，补充描述与话题。

远端 CI（`9863ccb`）：两平台 check（含 E2E）、两平台打包与依赖审计全部通过，Windows check 已恢复。

提交信息校验与 CHANGELOG（2026-10-05，同步自 DevHub 99ce072，ADR 0009）：husky `commit-msg` 钩子与 CI `commit-messages` 任务校验 Conventional Commits；`pnpm release` 把上个 tag 以来的 feat / fix / perf 写入 `CHANGELOG.md`，release 工作流以该段作为 Release 正文。模板仓库本身不发布，Release 正文的实际效果在 DevHub 下次发布时验证。

待办：真实安装与跨版本更新实测。
