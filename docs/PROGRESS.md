# 进度

当前：初始化、打包与 CI/发布配置已完成，Windows 验证通过；Linux 与远端 CI 尚未运行。

已提取应用外壳、通信、安全、存储、事件、设置、主题、更新及便签示例；中性图标与生成脚本可用。

初始化与交付：`pnpm initialize` 预览后写入三个标识文件，可重复执行、写入失败时回滚、拒绝非模板目录与 appId 静默变更。打包配置、NSIS 安装子目录、窗口标题与更新源均从 app.config.json 读取；`pnpm identity` 检查一致性与来源残留，发布模式另外要求非默认标识与匹配的仓库。新增 CI（审计、两平台 check+E2E、两平台真实打包与产物校验）、release 与 dependabot。

验证（Windows）：pnpm check 通过（脚本 31、desktop 45、shared 2 个测试）；默认配置及两组产品配置（中文名并配置仓库、ASCII 名称且无仓库）均通过 check 与 E2E 3/3，Windows 安装包/免安装包名称、可执行文件、更新源（含无仓库时不生成）与产物校验一致，打包版能启动且标题正确。

待办：Linux 打包与 E2E、远端 CI、真实安装与跨版本更新实测；LICENSE 待确定。
