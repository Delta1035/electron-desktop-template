import { join } from 'path'
import {
  notesSchema,
  settingsSchema,
  type AppApi,
  type AppEvents,
  type AppInfo
} from '@desktop/shared'
import { createEventBus } from './events/event-bus'
import { createJsonStore } from './storage/json-store'
import { createNoteService } from './notes/note-service'
import { createSettingsService } from './settings/settings-service'
export type AppCore = AppApi & AppEvents & { dispose(): Promise<void> }
export function createAppCore(options: AppInfo & { dataDir: string }): AppCore {
  const bus = createEventBus((error) => console.error('[events]', error))
  const notes = createNoteService(
    createJsonStore({
      filePath: join(options.dataDir, 'notes.json'),
      schema: notesSchema,
      fallback: () => []
    }),
    (value) => bus.emit({ type: 'notes-updated', notes: value })
  )
  const settings = createSettingsService(
    createJsonStore({
      filePath: join(options.dataDir, 'settings.json'),
      schema: settingsSchema,
      fallback: () => settingsSchema.parse({})
    }),
    (value) => bus.emit({ type: 'settings-updated', settings: value })
  )
  return {
    getAppInfo: async () => ({
      version: options.version,
      platform: options.platform,
      productName: options.productName
    }),
    listNotes: notes.listNotes,
    addNote: notes.addNote,
    removeNote: notes.removeNote,
    getSettings: settings.getSettings,
    updateSettings: settings.updateSettings,
    subscribe: bus.subscribe,
    async dispose() {
      await Promise.all([notes.flush(), settings.flush()])
    }
  }
}
