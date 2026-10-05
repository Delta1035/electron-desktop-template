# 0009 提交信息校验与 CHANGELOG：零依赖脚本

- 状态：已采纳
- 日期：2026-10-05
- 来源：同步自 DevHub ADR 0026

## 背景

提交信息约定为 Conventional Commits，但没有任何检查。直接向 main 提交时，`release.yml` 的 `--generate-notes` 按 PR 生成说明，结果基本为空。

## 决策

用两个零依赖 Node 脚本实现，不引入新依赖，发布流程（`pnpm release` → `git push --follow-tags` → 草稿 Release）不变。

- `scripts/commit-msg.mjs`：校验首行 `type(scope)!: subject`。type 限于 feat / fix / perf / refactor / docs / test / build / ci / chore / style / revert，首行不超过 100 字符，正文前需空一行；git 生成的 `Merge …`、`Revert "…"` 放行。
  - 本地：husky `commit-msg` 钩子校验提交信息文件（忽略 `#` 注释和 scissors 以下内容），`fixup!` / `squash!` 在本地放行。
  - CI：`ci.yml` 的 `commit-messages` 任务用 `--range` 复查 PR 内或本次推送的提交，这样 `--no-verify` 和网页提交也会被检查到；`fixup!` 在 CI 中拒绝。
- `scripts/changelog.mjs`：
  - `release`：作为 `apps/desktop` 的 `version` 生命周期脚本，由 `pnpm release` 在改版本号之后、提交之前运行，把上一个 `v*` tag 以来的提交写成 `CHANGELOG.md` 顶部的一段并执行 `git add`，这一段随版本提交一起提交。只收录 Breaking Changes、feat、fix、perf；条目即提交主题，推送前可以改写。
  - `notes <tag>`：取出某个版本的段落。release 工作流在 build 开始时检查段落是否存在（缺少则提前失败），release 任务用它作为 `gh release create --notes-file`。
- 从模板创建的新仓库只带 `CHANGELOG.md` 标题；第一次发布时收录全部历史提交，不符合约定的提交（如 GitHub 生成的 `Initial commit`）会被跳过。

## 备选与理由

- commitlint + git-cliff：需要新增两个依赖，而模板只需要一套固定规则和一种段落格式。
- release-please：会把发布方式改成合并 Release PR，与「本地 `pnpm release` 打 tag」的流程不一致。

## 已知限制

- 条目来自提交主题，质量取决于提交信息的写法。
- 推送到 main 时，如果旧的分支末端不可达（新分支、强推），CI 只检查最新一个提交。
