# 删除便签示例

1. 删除 shared/notes.ts 和 index.ts 中对应导出；删除 API 的 listNotes/addNote/removeNote 及方法清单项。
2. 从 events.ts 删除 notes-updated，加入新业务需要的事件。
3. 删除 core/notes，移除 app-core 的便签组装和方法；保留 storage、events、settings。
4. 删除 renderer/features/notes，替换 App 的默认页面；移除 use-events-sync 中便签分支。
5. 替换 schemas/core/E2E 中便签用例，继续保留存储、设置、窗口、安全和通信的验证。
6. 更新 README，执行 pnpm check 和 pnpm e2e。

新功能仍遵循 shared 契约 → core 实现及校验 → renderer api 访问的边界。
