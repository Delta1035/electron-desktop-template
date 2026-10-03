import type { Note } from './notes'
import type { Settings, SettingsPatch } from './settings'

export interface AppInfo {
  version: string
  platform: string
  productName: string
}
export interface AppApi {
  getAppInfo(): Promise<AppInfo>
  listNotes(): Promise<Note[]>
  addNote(text: string): Promise<Note>
  removeNote(id: string): Promise<void>
  getSettings(): Promise<Settings>
  updateSettings(patch: SettingsPatch): Promise<Settings>
}
export type AppApiMethod = keyof AppApi
export const appApiMethods = [
  'getAppInfo',
  'listNotes',
  'addNote',
  'removeNote',
  'getSettings',
  'updateSettings'
] as const satisfies readonly AppApiMethod[]
type MissingMethods = Exclude<AppApiMethod, (typeof appApiMethods)[number]>
const assertAllMethodsListed: MissingMethods extends never ? true : MissingMethods = true
void assertAllMethodsListed
export const ipcChannel = (method: AppApiMethod): string => `desktop:${method}`
export type IpcResult<T> =
  { ok: true; value: T } | { ok: false; error: { code: string; message: string } }
export interface ShellApi {
  /** Opens a native folder picker; resolves to null when cancelled. */
  pickDirectory(): Promise<string | null>
  /** Opens a native file picker; resolves to null when cancelled. */
  pickFile(title: string): Promise<string | null>
  /** Opens an http(s) URL in the default browser; other protocols are rejected. */
  openExternal(url: string): Promise<void>
  getUpdateStatus(): Promise<UpdateStatus>
  /** Looks for a newer release; the result arrives as a status change. */
  checkForUpdates(): Promise<void>
  downloadUpdate(): Promise<void>
  /** Quits (stopping every run, as on a normal quit) and installs the downloaded update. */
  installUpdate(): Promise<void>
  /** Called on every status change; returns a function that unsubscribes. */
  onUpdateStatus(listener: (status: UpdateStatus) => void): () => void
  /** The window draws its own title bar (ADR 0005); these back its buttons. */
  getWindowState(): Promise<WindowState>
  /** Called when the window is maximized, restored or enters / leaves full screen. */
  onWindowState(listener: (state: WindowState) => void): () => void
  minimizeWindow(): Promise<void>
  toggleMaximizeWindow(): Promise<void>
  /** Same as the system close button: hides to the tray or quits, per settings. */
  closeWindow(): Promise<void>
}

export interface WindowState {
  /** Host OS (`win32` / `linux` / `darwin`): macOS keeps its own traffic-light buttons. */
  platform: string
  maximized: boolean
  fullScreen: boolean
}

/**
 * Self-update of the installed app. `unsupported`: dev builds and the .deb package (updated by
 * the system package manager), where nothing is checked.
 */
export type UpdateStatus =
  | { state: 'unsupported'; reason: string }
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'up-to-date'; checkedAt: string }
  | { state: 'available'; version: string }
  | { state: 'downloading'; version: string; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }

export const shellChannel = {
  pickDirectory: 'shell:pickDirectory',
  pickFile: 'shell:pickFile',
  getUpdateStatus: 'shell:getUpdateStatus',
  checkForUpdates: 'shell:checkForUpdates',
  downloadUpdate: 'shell:downloadUpdate',
  installUpdate: 'shell:installUpdate',
  /** Pushed from main to the renderer. */
  updateStatus: 'shell:updateStatus',
  openExternal: 'shell:openExternal',
  getWindowState: 'shell:getWindowState',
  /** Pushed from main to the renderer. */
  windowState: 'shell:windowState',
  minimizeWindow: 'shell:minimizeWindow',
  toggleMaximizeWindow: 'shell:toggleMaximizeWindow',
  closeWindow: 'shell:closeWindow'
} as const
