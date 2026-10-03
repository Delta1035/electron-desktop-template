import { randomUUID } from 'crypto'
import { AppError, noteIdSchema, noteTextSchema, type Note } from '@desktop/shared'
import type { JsonStore } from '../storage/json-store'
import { createSerialState } from '../storage/serial-state'

export function createNoteService(
  store: JsonStore<Note[]>,
  publish: (notes: Note[]) => void
): {
  listNotes(): Promise<Note[]>
  addNote(text: unknown): Promise<Note>
  removeNote(id: unknown): Promise<void>
  flush(): Promise<void>
} {
  const state = createSerialState(store)
  return {
    listNotes: state.read,
    async addNote(raw) {
      const parsed = noteTextSchema.safeParse(raw)
      if (!parsed.success) throw new AppError('INVALID_INPUT', '便签需要 1–2000 个字符')
      const note: Note = {
        id: randomUUID(),
        text: parsed.data,
        createdAt: new Date().toISOString()
      }
      return state
        .update((notes) => ({ value: [...notes, note], result: note }))
        .then((result) => {
          // Read through the same queue so events cannot carry an older snapshot.
          return state.read().then((notes) => {
            publish(notes)
            return result
          })
        })
    },
    async removeNote(raw) {
      const parsed = noteIdSchema.safeParse(raw)
      if (!parsed.success) throw new AppError('INVALID_INPUT', '无效的便签标识')
      await state.update((notes) => {
        if (!notes.some((note) => note.id === parsed.data))
          throw new AppError('NOT_FOUND', '便签不存在')
        return { value: notes.filter((note) => note.id !== parsed.data), result: undefined }
      })
      publish(await state.read())
    },
    flush: state.flush
  }
}
