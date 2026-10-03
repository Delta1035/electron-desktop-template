import * as fsPromises from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { configFields, readJsonFile, templateIdentity, validateAppConfig } from './app-config.mjs'

/** Exit codes: 0 done or nothing to do, 1 a write failed, 2 invalid input or not the template. */
export const exitCode = { ok: 0, writeFailed: 1, invalid: 2 }

/** Every file initialize may write. Nothing else is touched; source code reads app.config.json. */
export const managedFiles = ['app.config.json', 'package.json', 'apps/desktop/package.json']

// Internal workspace packages keep fixed names, so they identify a copy of this template.
const templatePackages = { 'apps/desktop/package.json': '@desktop/desktop' }

const options = {
  'project-name': { type: 'string' },
  'product-name': { type: 'string' },
  'app-id': { type: 'string' },
  author: { type: 'string' },
  homepage: { type: 'string' },
  repository: { type: 'string' },
  yes: { type: 'boolean', default: false },
  'allow-app-id-change': { type: 'boolean', default: false },
  help: { type: 'boolean', default: false }
}

export const usage = `用法：pnpm initialize --project-name <名称> --product-name <产品名> --app-id <标识>
                       --author <作者> --homepage <地址> [--repository <owner/repo>] [--yes]

  --project-name         小写字母、数字和中划线；用于包名、可执行文件、安装目录和产物名
  --product-name         显示名称：标题栏、安装器、快捷方式、托盘
  --app-id               反向域名，例如 com.example.mytool；决定数据目录和安装身份
  --author               作者，写入包元数据与 Linux 安装包
  --homepage             产品主页，http/https
  --repository           可选，GitHub owner/repo；省略时关闭自动更新
  --yes                  确认写入；不加时只预览变更
  --allow-app-id-change  已初始化项目修改 appId 时必须提供`

class InitError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

/** Parses argv into an app config candidate; usage problems become InitError(invalid). */
export function parseOptions(argv) {
  let values
  try {
    ;({ values } = parseArgs({ args: argv, options, strict: true, allowPositionals: false }))
  } catch (error) {
    throw new InitError(`参数错误：${error.message}\n\n${usage}`, exitCode.invalid)
  }
  if (values.help) return { help: true }
  const required = ['project-name', 'product-name', 'app-id', 'author', 'homepage']
  const missing = required.filter((name) => values[name] === undefined)
  if (missing.length > 0) {
    const list = missing.map((name) => `--${name}`).join('、')
    throw new InitError(`缺少必填参数：${list}\n\n${usage}`, exitCode.invalid)
  }
  return {
    help: false,
    yes: values.yes,
    allowAppIdChange: values['allow-app-id-change'],
    config: {
      projectName: values['project-name'],
      productName: values['product-name'],
      appId: values['app-id'],
      author: values.author,
      homepage: values.homepage,
      repository: values.repository ?? null
    }
  }
}

function serialize(value, eol) {
  return JSON.stringify(value, null, 2).replaceAll('\n', eol) + eol
}

async function readManaged(root, fs) {
  const files = {}
  for (const path of managedFiles) {
    try {
      files[path] = await readJsonFile(join(root, path), fs.readFile)
    } catch (error) {
      throw new InitError(
        `${error.message}\n${root} 不是本模板的副本，或文件已损坏；请在模板根目录运行，或用 git checkout -- ${path} 恢复。`,
        exitCode.invalid
      )
    }
  }
  return files
}

/** Refuses to touch anything that does not look like an (initialized) copy of this template. */
function assertTemplate(files) {
  const problems = []
  for (const [path, name] of Object.entries(templatePackages)) {
    if (files[path].value.name !== name) problems.push(`${path} 的 name 不是 ${name}`)
  }
  const current = validateAppConfig(files['app.config.json'].value)
  if (!current.ok) {
    problems.push(...current.errors.map((error) => `app.config.json：${error}`))
  } else {
    const root = files['package.json'].value
    const desktop = files['apps/desktop/package.json'].value
    if (root.name !== current.config.projectName)
      problems.push(`package.json 的 name 与 app.config.json 的 projectName 不一致`)
    if (desktop.productName !== current.config.productName)
      problems.push(`apps/desktop/package.json 的 productName 与 app.config.json 不一致`)
  }
  if (problems.length > 0) {
    throw new InitError(
      `拒绝修改：当前目录不是本模板的副本，或标识文件已被手动改动。\n  - ${problems.join('\n  - ')}\n` +
        `请确认在模板根目录运行；若是手动改动，修正上述字段或用 git checkout -- ${managedFiles.join(' ')} 恢复后重试。`,
      exitCode.invalid
    )
  }
  return current.config
}

/**
 * Validates the request against the files under root and computes the exact new contents.
 * Reads only; returns the changes for applyPlan.
 */
export async function planInitialization(root, request, fs = fsPromises) {
  const files = await readManaged(root, fs)
  const current = assertTemplate(files)
  const next = validateAppConfig(request.config)
  const errors = next.ok ? [] : [...next.errors]
  if (request.config.appId === templateIdentity.appId)
    errors.push(`appId 不能使用模板默认值 ${templateIdentity.appId}`)
  if (errors.length > 0)
    throw new InitError(`参数无效：\n  - ${errors.join('\n  - ')}`, exitCode.invalid)
  const config = next.config

  const appIdChanged = current.appId !== templateIdentity.appId && current.appId !== config.appId
  if (appIdChanged && !request.allowAppIdChange) {
    throw new InitError(
      `appId 将从 ${current.appId} 改为 ${config.appId}。这会更换应用数据目录和安装身份：` +
        `已安装的旧版本不会被升级覆盖，用户数据不会自动迁移。\n确认后追加 --allow-app-id-change 重新执行。`,
      exitCode.invalid
    )
  }

  const values = {
    'app.config.json': Object.fromEntries(configFields.map((field) => [field, config[field]])),
    'package.json': { ...files['package.json'].value, name: config.projectName },
    'apps/desktop/package.json': {
      ...files['apps/desktop/package.json'].value,
      productName: config.productName,
      homepage: config.homepage,
      author: config.author,
      // Electron uses it as the Linux app_id / WM_CLASS; the deb installs a matching .desktop file.
      desktopName: `${config.projectName}.desktop`
    }
  }
  const changes = []
  for (const path of managedFiles) {
    const before = files[path].text
    const after = serialize(values[path], before.includes('\r\n') ? '\r\n' : '\n')
    if (after !== before) changes.push({ path, before, after })
  }
  const fields = configFields
    .filter((field) => current[field] !== config[field])
    .map((field) => ({ field, from: current[field], to: config[field] }))
  return { config, changes, fields, appIdChanged }
}

/**
 * Writes every change or none: all new contents are staged next to their targets first, then
 * renamed into place. A failed rename restores the files already replaced.
 */
export async function applyPlan(root, changes, fs = fsPromises) {
  const staged = changes.map((change) => ({
    ...change,
    target: join(root, change.path),
    temp: join(root, `${change.path}.${process.pid}.initialize.tmp`)
  }))
  const removeTemps = () =>
    Promise.all(staged.map((file) => fs.rm(file.temp, { force: true }).catch(() => undefined)))

  try {
    for (const file of staged) await fs.writeFile(file.temp, file.after, 'utf8')
  } catch (error) {
    await removeTemps()
    throw new InitError(
      `写入临时文件失败，未修改任何文件：${error.message}\n检查目录写权限与磁盘空间后重新执行同一命令。`,
      exitCode.writeFailed
    )
  }

  const replaced = []
  for (const file of staged) {
    try {
      await fs.rename(file.temp, file.target)
      replaced.push(file)
    } catch (error) {
      const unrestored = []
      for (const done of replaced) {
        try {
          await fs.writeFile(done.target, done.before, 'utf8')
        } catch {
          unrestored.push(done.path)
        }
      }
      await removeTemps()
      const recovery =
        unrestored.length === 0
          ? '已恢复先前写入的文件，项目保持原状。关闭占用这些文件的程序（编辑器、杀毒软件）后重新执行同一命令。'
          : `以下文件已被修改且未能恢复：${unrestored.join('、')}。` +
            `用 git checkout -- ${managedFiles.join(' ')} 恢复后重新执行同一命令。`
      throw new InitError(
        `替换 ${file.path} 失败：${error.message}\n${recovery}`,
        exitCode.writeFailed
      )
    }
  }
}

function describePlan(plan) {
  const show = (value) => (value === null ? '（无，关闭自动更新）' : JSON.stringify(value))
  const lines = ['产品标识变更：']
  for (const { field, from, to } of plan.fields)
    lines.push(`  ${field}: ${show(from)} -> ${show(to)}`)
  lines.push('将写入文件：', ...plan.changes.map((change) => `  ${change.path}`))
  if (plan.appIdChanged)
    lines.push('注意：appId 已变更，应用将使用新的数据目录与安装身份，旧数据不会自动迁移。')
  return lines.join('\n')
}

/** CLI entry; returns the process exit code instead of exiting so tests can drive it. */
export async function main(argv, { root, stdout, stderr, fs = fsPromises }) {
  try {
    const request = parseOptions(argv)
    if (request.help) {
      stdout.write(`${usage}\n`)
      return exitCode.ok
    }
    const plan = await planInitialization(root, request, fs)
    if (plan.changes.length === 0) {
      stdout.write('配置已是目标值，未修改任何文件。\n')
      return exitCode.ok
    }
    stdout.write(`${describePlan(plan)}\n`)
    if (!request.yes) {
      stdout.write('\n预览模式：未写入任何文件。确认无误后追加 --yes 重新执行。\n')
      return exitCode.ok
    }
    await applyPlan(root, plan.changes, fs)
    stdout.write(
      '\n初始化完成。下一步：替换 apps/desktop/build/*.svg 后运行 pnpm --filter @desktop/desktop icons，' +
        '然后 pnpm check、pnpm e2e。\n'
    )
    return exitCode.ok
  } catch (error) {
    if (error instanceof InitError) {
      stderr.write(`${error.message}\n`)
      return error.code
    }
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)))
  process.exitCode = await main(process.argv.slice(2), {
    root,
    stdout: process.stdout,
    stderr: process.stderr
  })
}
