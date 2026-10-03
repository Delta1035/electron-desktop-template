import { AppError, settingsPatchSchema, type Settings } from '@desktop/shared'
import type { JsonStore } from '../storage/json-store'
import { createSerialState } from '../storage/serial-state'
export function createSettingsService(
  store: JsonStore<Settings>,
  publish: (settings: Settings) => void
): {
  getSettings(): Promise<Settings>
  updateSettings(raw: unknown): Promise<Settings>
  flush(): Promise<void>
} {
  const state = createSerialState(store)
  return {
    getSettings: state.read,
    async updateSettings(raw) {
      const patch = settingsPatchSchema.safeParse(raw)
      if (!patch.success) throw new AppError('INVALID_INPUT', '无效的设置')
      await state.update((current) => {
        const settings = { ...current, ...patch.data }
        return { value: settings, result: undefined }
      })
      const settings = await state.read()
      publish(settings)
      return settings
    },
    flush: state.flush
  }
}
