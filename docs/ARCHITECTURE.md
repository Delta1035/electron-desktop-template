# 架构

独立 pnpm workspace：apps/desktop 是 Electron 客户端，packages/shared 是平台无关契约。renderer 仅通过 @renderer/api 调用 core；main/core 不依赖 Electron，shared 不依赖 Node 或 Electron。ESLint 强制这些边界。

AppApi 与 appApiMethods 定义请求方法；main/ipc 和 preload 自动映射。ShellApi 是原生对话框、更新及窗口能力。AppEvents 通过独立事件通道推送；订阅支持取消和错误隔离。当前无 HTTP/WebSocket 实现。

app-core 组装 notes 与 settings。输入在 core 使用 zod 校验，预期失败使用 AppError；未知异常仅在主进程记录，客户端接收通用消息。JSON 损坏文件备份后使用默认值，写入用临时文件替换；服务以串行队列处理读改写，提交成功后再发布事件。退出等待队列清理；更新安装显式等待清理成功。

设置只有 closeAction，存 settings.json；主题存 localStorage，键由 appId 派生。应用数据目录以 appId 命名，开发追加 -dev；显式 --user-data-dir 优先。资源和品牌用中性占位配置，默认更新源为空。

便签 UI 独立在 features/notes，core 在 core/notes，schema 在 shared/notes。新增功能先改契约和方法清单，再服务和测试，再 UI。所有方法返回 Promise。

产品标识只在 app.config.json 中维护，规则集中在 scripts/app-config.mjs（运行时 main/app-config.ts 用 zod 保持相同规则）。scripts/initialize.mjs 只结构化写入 app.config.json 与两个 package.json；main 与 renderer 构建时导入配置，Vite 插件写入窗口标题，electron-builder.config.mjs 经 scripts/builder-config.mjs 生成打包配置并写入 build/generated/installer.nsh 定义安装子目录。packaged name 用 extraMetadata 设为 projectName，避免各应用共享更新缓存；无 repository 时 publish 显式为 null。scripts/check-identity.mjs 检查一致性与来源残留，发布模式另外要求非默认标识与匹配的仓库；scripts/verify-package.mjs 校验真实产物。

check 包含格式、lint、类型、单测与标识检查。E2E 驱动构建后的真实应用，验证便签、主题、窗口、对话框、外链和数据隔离；失败保存 trace 和 Electron 输出。
