import { join, resolve } from 'path'
import { readFile } from 'fs/promises'
import type { AppApi, ShellApi } from '@desktop/shared'
import { test, expect } from './fixtures'
interface Bridge {
  desktop: AppApi
  appShell: ShellApi
}
test('notes survive restart, delete persists and events update another window', async ({
  launchApp,
  workDir
}) => {
  const { app, page } = await launchApp()
  await page.getByRole('textbox', { name: '便签内容' }).fill('Remember this')
  await page.getByRole('button', { name: '添加', exact: true }).click()
  await expect(page.getByText('Remember this', { exact: true })).toBeVisible()
  const mirror = await app.evaluate(
    async ({ BrowserWindow }, preload) => {
      const first = BrowserWindow.getAllWindows()[0]!
      const second = new BrowserWindow({
        show: false,
        webPreferences: { preload, sandbox: true, contextIsolation: true }
      })
      await second.loadURL(first.webContents.getURL())
      return second.id
    },
    resolve(__dirname, '..', 'out', 'preload', 'index.js')
  )
  await page.evaluate(() => (window as unknown as Bridge).desktop.addNote('From event'))
  await expect
    .poll(() =>
      app.evaluate(
        ({ BrowserWindow }, id) =>
          BrowserWindow.fromId(id)!.webContents.executeJavaScript('document.body.innerText'),
        mirror
      )
    )
    .toContain('From event')
  await app.close()
  const next = await launchApp()
  await expect(next.page.getByText('Remember this', { exact: true })).toBeVisible()
  await next.page.getByRole('button', { name: '删除 Remember this', exact: true }).click()
  await expect(next.page.getByText('Remember this', { exact: true })).toHaveCount(0)
  await next.app.close()
  const final = await launchApp()
  await expect(final.page.getByText('From event', { exact: true })).toBeVisible()
  await expect(final.page.getByText('Remember this', { exact: true })).toHaveCount(0)
  expect(JSON.parse(await readFile(join(workDir, 'userdata', 'notes.json'), 'utf8'))).toHaveLength(
    1
  )
})
test('theme and close behavior persist; configured profile stays isolated', async ({
  launchApp,
  workDir
}) => {
  const { app, page } = await launchApp()
  expect(await app.evaluate(({ app }) => app.getPath('userData'))).toBe(join(workDir, 'userdata'))
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('radio', { name: '深色', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByLabel('关闭窗口时').selectOption('quit')
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Bridge).desktop.getSettings()))
    .toEqual({ closeAction: 'quit' })
  await app.close()
  const next = await launchApp()
  await expect(next.page.locator('html')).toHaveClass(/dark/)
  await next.page.getByRole('button', { name: '设置', exact: true }).click()
  await expect(next.page.getByLabel('关闭窗口时')).toHaveValue('quit')
  const exited = next.app.waitForEvent('close')
  await next.page.getByRole('button', { name: '关闭', exact: true }).click()
  await exited
})
test('window controls, safe external links, dialog cancellation and unsupported updates', async ({
  launchApp
}) => {
  const { productName, repository } = JSON.parse(
    await readFile(resolve(__dirname, '..', '..', '..', 'app.config.json'), 'utf8')
  ) as { productName: string; repository: string | null }
  const { app, page } = await launchApp()
  await expect(page.getByRole('heading', { name: productName, exact: true })).toBeVisible()
  expect(await page.title()).toBe(productName)
  await app.evaluate(({ dialog }) =>
    Object.assign(dialog, { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) })
  )
  expect(
    await page.evaluate(() => (window as unknown as Bridge).appShell.pickDirectory())
  ).toBeNull()
  expect(
    await page.evaluate(() => (window as unknown as Bridge).appShell.pickFile('Test'))
  ).toBeNull()
  expect(
    await page.evaluate(async () => {
      try {
        await (window as unknown as Bridge).appShell.openExternal('file:///secret')
        return false
      } catch {
        return true
      }
    })
  ).toBe(true)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  // E2E runs the unpackaged build, so updates stay off even with a repository configured.
  await expect(page.getByRole('status')).toHaveText(
    repository === null ? '尚未配置更新仓库' : '开发版本不检查更新'
  )
  await expect(page.getByRole('button', { name: '检查更新', exact: true })).toHaveCount(0)
  if (process.platform === 'win32' || (process.platform === 'linux' && !process.env.CI)) {
    await page.getByRole('button', { name: '最大化', exact: true }).click()
    await expect(page.getByRole('button', { name: '还原', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '还原', exact: true }).click()
    await page.getByRole('button', { name: '最小化', exact: true }).click()
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.isMinimized())
      )
      .toBe(true)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.restore())
  }
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.isVisible()))
    .toBe(false)
})
