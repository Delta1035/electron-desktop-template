import type { AppApi, AppEvents, ShellApi } from '@desktop/shared'

declare global {
  interface Window {
    desktop: AppApi
    appEvents: AppEvents
    appShell?: ShellApi
  }
}

/**
 * The only entry point for UI code to reach the app core.
 * Today it is the Electron preload bridge; a mobile/PWA build swaps in an HTTP client here.
 */
export const api: AppApi = window.desktop

/** Pushed run updates and output. A remote build swaps in a WebSocket implementation. */
export const events: AppEvents = window.appEvents

/** Local desktop capabilities (native dialogs). Null when running as a remote client. */
export const shell: ShellApi | null = window.appShell ?? null
