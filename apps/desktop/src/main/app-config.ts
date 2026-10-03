import { z } from 'zod'
import raw from '../../../../app.config.json'

// Mirrors scripts/app-config.mjs, which initialize and packaging use; keep the rules in sync.
const text = (max: number): z.ZodString =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => value.trim() === value && !/[<>:"/\\|?*\p{Cc}]/u.test(value))

const schema = z
  .object({
    projectName: z
      .string()
      .max(50)
      .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
    productName: text(80),
    appId: z
      .string()
      .max(100)
      .regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/),
    author: text(100),
    homepage: z.url({ protocol: /^https?$/ }),
    repository: z
      .string()
      .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9_.-]+$/)
      .refine((value) => !/\/\.\.?$/.test(value))
      .nullable()
  })
  .strict()
export const appConfig = schema.parse(raw)
