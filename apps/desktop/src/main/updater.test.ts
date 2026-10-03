import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shellChannel } from '@desktop/shared'

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, () => Promise<unknown>>(),
  listeners: new Map<string, (info: { version: string }) => void>(),
  quitAndInstall: vi.fn()
}))

vi.mock('electron', () => ({
  app: { isPackaged: true },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: {
    handle: (channel: string, handler: () => Promise<unknown>) =>
      mocks.handlers.set(channel, handler)
  }
}))

vi.mock('electron-updater', () => ({
  autoUpdater: {
    on: (event: string, listener: (info: { version: string }) => void) =>
      mocks.listeners.set(event, listener),
    setFeedURL: vi.fn(),
    quitAndInstall: mocks.quitAndInstall
  }
}))

import { registerUpdater } from './updater'

const install = () => mocks.handlers.get(shellChannel.installUpdate)!()
const ready = () => mocks.listeners.get('update-downloaded')!({ version: '0.2.0' })

describe('update installation', () => {
  it('disables updates when no repository is configured', async () => {
    registerUpdater(async () => {}, null)
    expect(await mocks.handlers.get(shellChannel.getUpdateStatus)!()).toMatchObject({
      ok: true,
      value: { state: 'unsupported' }
    })
    expect(mocks.listeners.size).toBe(0)
  })
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('APPIMAGE', '/tmp/desktop.AppImage')
    mocks.handlers.clear()
    mocks.listeners.clear()
    mocks.quitAndInstall.mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('waits for managed processes to stop before installing, even with repeated requests', async () => {
    let finishStopping = () => {}
    const stopRuns = vi.fn(() => new Promise<void>((resolve) => (finishStopping = resolve)))
    registerUpdater(stopRuns, 'example/starter')
    ready()

    const pending = install()
    await install()
    expect(stopRuns).toHaveBeenCalledTimes(1)
    expect(mocks.quitAndInstall).not.toHaveBeenCalled()

    finishStopping()
    expect(await pending).toEqual({ ok: true, value: undefined })
    await install()
    expect(stopRuns).toHaveBeenCalledTimes(1)
    expect(mocks.quitAndInstall).toHaveBeenCalledTimes(1)
  })

  it('does not install when stopping managed processes fails', async () => {
    registerUpdater(async () => {
      throw new Error('Unable to stop managed processes')
    }, 'example/starter')
    ready()

    expect(await install()).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Unable to stop managed processes' }
    })
    expect(mocks.quitAndInstall).not.toHaveBeenCalled()
    expect(await mocks.handlers.get(shellChannel.getUpdateStatus)!()).toEqual({
      ok: true,
      value: { state: 'error', message: 'Unable to stop managed processes' }
    })
  })

  it('does not stop processes or install before an update has downloaded', async () => {
    const stopRuns = vi.fn(async () => {})
    registerUpdater(stopRuns, 'example/starter')
    await install()
    expect(stopRuns).not.toHaveBeenCalled()
    expect(mocks.quitAndInstall).not.toHaveBeenCalled()
  })
})
