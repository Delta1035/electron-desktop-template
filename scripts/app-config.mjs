import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Product identity rules shared by initialize, packaging and the identity check.
 * apps/desktop/src/main/app-config.ts mirrors them for the runtime; keep both in sync.
 */
export const configFields = [
  'projectName',
  'productName',
  'appId',
  'author',
  'homepage',
  'repository'
]

/** The values shipped with the template; a released app must replace every one of them. */
export const templateIdentity = Object.freeze({
  projectName: 'desktop-starter',
  productName: 'Desktop Starter',
  appId: 'com.example.desktopstarter',
  author: 'Template Author',
  homepage: 'https://example.com',
  repository: null
})

/** Identities of the app the template was extracted from; reusing them would collide with it. */
export const reservedIdentity = Object.freeze({
  projectNames: ['devhub'],
  appIds: ['com.devhub.desktop'],
  repositoryOwners: ['delta1035']
})

export const projectNamePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
export const appIdPattern = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/
export const repositoryPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9_.-]+$/
// Characters Windows forbids in file names; productName becomes shortcut and installer names.
const unsafeNameChars = /[<>:"/\\|?*\p{Cc}]/u

function checkText(value, label, max) {
  if (typeof value !== 'string') return `${label} 必须是字符串`
  if (value.trim() !== value || value === '') return `${label} 不能为空，且首尾不能有空白`
  if (value.length > max) return `${label} 不能超过 ${max} 个字符`
  if (unsafeNameChars.test(value)) return `${label} 不能包含控制字符或 < > : " / \\ | ? *`
  return null
}

const fieldChecks = {
  projectName: (value) => {
    if (typeof value !== 'string' || !projectNamePattern.test(value) || value.length > 50)
      return 'projectName 只能包含小写字母、数字和单个中划线，以字母开头、不以中划线结尾，最长 50 个字符（例：my-tool）'
    if (reservedIdentity.projectNames.includes(value))
      return `projectName "${value}" 已被来源应用使用，请换一个名称`
    return null
  },
  productName: (value) => checkText(value, 'productName', 80),
  appId: (value) => {
    if (typeof value !== 'string' || !appIdPattern.test(value) || value.length > 100)
      return 'appId 必须是小写反向域名，各段以字母开头且只含字母和数字（例：com.example.mytool）'
    if (reservedIdentity.appIds.includes(value))
      return `appId "${value}" 已被来源应用使用，请换一个标识`
    return null
  },
  author: (value) => checkText(value, 'author', 100),
  homepage: (value) => {
    let url
    try {
      url = new URL(value)
    } catch {
      return 'homepage 必须是完整的 http/https 地址（例：https://example.com/my-tool）'
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
      return 'homepage 只允许 http 或 https 地址'
    return null
  },
  repository: (value) => {
    if (value === null) return null
    if (typeof value !== 'string' || !repositoryPattern.test(value) || /\/\.\.?$/.test(value))
      return 'repository 必须是 GitHub 的 owner/repo 形式，或为 null 以关闭更新'
    const owner = value.split('/')[0].toLowerCase()
    if (reservedIdentity.repositoryOwners.includes(owner))
      return `repository "${value}" 指向来源应用的仓库，请改为你自己的仓库`
    return null
  }
}

/**
 * @returns {{ ok: true, config: Record<string, string | null> } | { ok: false, errors: string[] }}
 */
export function validateAppConfig(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
    return { ok: false, errors: ['配置必须是 JSON 对象'] }
  const errors = []
  for (const key of Object.keys(raw)) {
    if (!configFields.includes(key)) errors.push(`未知字段 ${key}`)
  }
  for (const field of configFields) {
    if (!(field in raw)) {
      errors.push(`缺少字段 ${field}`)
      continue
    }
    const error = fieldChecks[field](raw[field])
    if (error) errors.push(error)
  }
  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, config: Object.fromEntries(configFields.map((field) => [field, raw[field]])) }
}

/** Reads a JSON file, naming the file in every failure message. */
export async function readJsonFile(path, read = readFile) {
  let text
  try {
    text = await read(path, 'utf8')
  } catch (error) {
    const reason = error?.code === 'ENOENT' ? '文件不存在' : error?.message
    throw new Error(`无法读取 ${path}：${reason}`, { cause: error })
  }
  try {
    return { text, value: JSON.parse(text) }
  } catch (error) {
    throw new Error(`${path} 不是有效的 JSON：${error.message}`, { cause: error })
  }
}

/** Reads and validates <root>/app.config.json; throws a message listing every problem. */
export async function readAppConfig(root, read = readFile) {
  const path = join(root, 'app.config.json')
  const { value } = await readJsonFile(path, read)
  const result = validateAppConfig(value)
  if (!result.ok) throw new Error(`${path} 无效：\n  - ${result.errors.join('\n  - ')}`)
  return result.config
}
