# 模板开发约定

开始先读 docs/ARCHITECTURE.md。非琐碎改动先给方案并确认。core 不依赖 Electron，shared 不依赖 Node/Electron，renderer 只通过 @renderer/api 访问核心。新增 API 同时修改 AppApi 与 appApiMethods。外部输入在 core 使用 zod 校验。核心改动必须有行为测试；不使用 any、ts-ignore 或禁用规则，单文件不超过 400 行。

完成前 pnpm check 全通过；修改 UI、IPC/preload 或生命周期时 pnpm e2e 全通过。产品标识只改 app.config.json（用 pnpm initialize），不要在源码或打包配置中硬编码产品名、appId 或仓库。新增依赖先说明并确认；优先沿用当前技术栈。提交用 Conventional Commits。
