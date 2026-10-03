import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import {
  _electron as electron,
  test as base,
  type ElectronApplication,
  type Page
} from '@playwright/test'
import { closeRunningApps, trackAppDiagnostics } from './diagnostics'
export { expect } from '@playwright/test'
interface Fixtures {
  workDir: string
  launchApp: () => Promise<{ app: ElectronApplication; page: Page }>
}
export const test = base.extend<Fixtures>({
  workDir: async ({}, use) => {
    const dir = await mkdtemp(join(tmpdir(), 'desktop-e2e-'))
    try {
      await use(dir)
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5 })
    }
  },
  launchApp: async ({ workDir }, use, info) => {
    const launched: {
      app: ElectronApplication
      child: ReturnType<ElectronApplication['process']>
    }[] = []
    const diagnostics: (() => Promise<void>)[] = []
    try {
      await use(async () => {
        const env = Object.fromEntries(
          Object.entries(process.env).filter(
            ([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined
          )
        ) as Record<string, string>
        const app = await electron.launch({
          args: [
            resolve(__dirname, '..'),
            `--user-data-dir=${join(workDir, 'userdata')}`,
            ...(process.platform === 'linux' && process.env.CI ? ['--no-sandbox'] : [])
          ],
          env
        })
        launched.push({ app, child: app.process() })
        diagnostics.push(trackAppDiagnostics(app, info, launched.length - 1))
        await app.context().tracing.start({ screenshots: true, snapshots: true })
        const page = await app.firstWindow()
        await page.waitForLoadState('domcontentloaded')
        return { app, page }
      })
    } finally {
      for (const [index, { app, child }] of launched.entries()) {
        const failed = info.status !== info.expectedStatus
        if (failed) await diagnostics[index]?.().catch((error: unknown) => console.error(error))
        if (child.exitCode === null && child.signalCode === null)
          await app
            .context()
            .tracing.stop(failed ? { path: info.outputPath(`trace-${index}.zip`) } : undefined)
      }
      await closeRunningApps(launched)
    }
  }
})
