import { z } from 'zod'
export const settingsSchema = z
  .object({ closeAction: z.enum(['tray', 'quit']).default('tray') })
  .strict()
export const settingsPatchSchema = z
  .object({ closeAction: z.enum(['tray', 'quit']).optional() })
  .strict()
export type Settings = z.infer<typeof settingsSchema>
export type SettingsPatch = z.infer<typeof settingsPatchSchema>
