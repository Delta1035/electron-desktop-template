import { z } from 'zod'
export const noteTextSchema = z.string().trim().min(1).max(2000)
export const noteIdSchema = z.uuid()
export const noteSchema = z
  .object({ id: noteIdSchema, text: noteTextSchema, createdAt: z.iso.datetime() })
  .strict()
export const notesSchema = z.array(noteSchema)
export type Note = z.infer<typeof noteSchema>
