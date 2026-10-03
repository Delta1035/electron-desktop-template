import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  appApiMethods,
  appEventChannel,
  ipcChannel,
  shellChannel,
  type AppApi,
  type AppEvent,
  type AppEvents,
  type IpcResult,
  type ShellApi,
  type UpdateStatus,
  type WindowState
} from '@desktop/shared'

async function invoke(channel: string, ...args: unknown[]): Promise<unknown> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<unknown>
  if (result.ok) return result.value
  throw new Error(result.error.message)
}

const api = Object.fromEntries(
  appApiMethods.map((method) => [
    method,
    (...args: unknown[]) => invoke(ipcChannel(method), ...args)
  ])
) as unknown as AppApi

const shell: ShellApi = {
  pickDirectory: () => invoke(shellChannel.pickDirectory) as Promise<string | null>,
  pickFile: (title) => invoke(shellChannel.pickFile, title) as Promise<string | null>,
  getUpdateStatus: () => invoke(shellChannel.getUpdateStatus) as Promise<UpdateStatus>,
  checkForUpdates: async () => {
    await invoke(shellChannel.checkForUpdates)
  },
  downloadUpdate: async () => {
    await invoke(shellChannel.downloadUpdate)
  },
  installUpdate: async () => {
    await invoke(shellChannel.installUpdate)
  },
  onUpdateStatus(listener) {
    const handler = (_event: IpcRendererEvent, status: UpdateStatus): void => listener(status)
    ipcRenderer.on(shellChannel.updateStatus, handler)
    return () => {
      ipcRenderer.removeListener(shellChannel.updateStatus, handler)
    }
  },
  openExternal: async (url) => {
    await invoke(shellChannel.openExternal, url)
  },
  getWindowState: () => invoke(shellChannel.getWindowState) as Promise<WindowState>,
  onWindowState(listener) {
    const handler = (_event: IpcRendererEvent, state: WindowState): void => listener(state)
    ipcRenderer.on(shellChannel.windowState, handler)
    return () => {
      ipcRenderer.removeListener(shellChannel.windowState, handler)
    }
  },
  minimizeWindow: async () => {
    await invoke(shellChannel.minimizeWindow)
  },
  toggleMaximizeWindow: async () => {
    await invoke(shellChannel.toggleMaximizeWindow)
  },
  closeWindow: async () => {
    await invoke(shellChannel.closeWindow)
  }
}

const events: AppEvents = {
  subscribe(listener) {
    // Events come from our own main process, so they are trusted and not re-validated.
    const handler = (_event: IpcRendererEvent, event: AppEvent): void => listener(event)
    ipcRenderer.on(appEventChannel, handler)
    return () => {
      ipcRenderer.removeListener(appEventChannel, handler)
    }
  }
}

contextBridge.exposeInMainWorld('desktop', api)
contextBridge.exposeInMainWorld('appEvents', events)
contextBridge.exposeInMainWorld('appShell', shell)
