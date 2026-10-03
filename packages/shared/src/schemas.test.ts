import { describe, expect, it } from 'vitest'
import { noteTextSchema, settingsPatchSchema, settingsSchema } from './index'
describe('template schemas', () => {
  it('normalizes text and rejects empty and oversized notes', () => {
    expect(noteTextSchema.parse(' hello ')).toBe('hello')
    for (const input of ['', '  ', 'x'.repeat(2001), 42])
      expect(noteTextSchema.safeParse(input).success).toBe(false)
  })
  it('defaults close behavior and rejects unknown settings', () => {
    expect(settingsSchema.parse({})).toEqual({ closeAction: 'tray' })
    expect(settingsPatchSchema.parse({})).toEqual({})
    expect(settingsPatchSchema.safeParse({ closeAction: 'hide' }).success).toBe(false)
    expect(settingsPatchSchema.safeParse({ unexpected: true }).success).toBe(false)
  })
})
