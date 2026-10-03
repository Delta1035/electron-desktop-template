import type { Note } from './notes'
import type { Settings } from './settings'
export type AppEvent =
  { type: 'notes-updated'; notes: Note[] } | { type: 'settings-updated'; settings: Settings }
export interface AppEvents {
  subscribe(listener: (event: AppEvent) => void): () => void
}
export const appEventChannel = 'desktop:event'
