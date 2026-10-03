import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { configFields, readJsonFile, templateIdentity, validateAppConfig } from './app-config.mjs'

// Text that would point a copy at the app the template was extracted from.
const sourceResidue = /Delta1035|com\.devhub\.desktop/i
// Files that carry the product or release identity.
const identityFiles = [
  'app.config.json',
  'package.json',
  'apps/desktop/package.json',
  'apps/desktop/electron-builder.config.mjs',
  'apps/desktop/build/installer.nsh',
  'scripts/builder-config.mjs'
]

async function workflowFiles(root) {
  const dir = join('.github', 'workflows')
  try {
    const names = await readdir(join(root, dir))
    return names.filter((name) => /\.ya?ml$/.test(name)).map((name) => join(dir, name))
  } catch {
    return []
  }
}

/**
 * Lists every identity problem under root. The default mode checks that all files agree with
 * app.config.json; release mode also requires a fully customized identity and update feed.
 * @param {{ release?: boolean, repository?: string }} options repository: the GitHub repo
 *   being released from (GITHUB_REPOSITORY in CI).
 */
export async function checkIdentity(root, { release = false, repository } = {}) {
  const problems = []
  let raw
  try {
    raw = (await readJsonFile(join(root, 'app.config.json'))).value
  } catch (error) {
    return [error.message]
  }
  const result = validateAppConfig(raw)
  if (!result.ok) return result.errors.map((error) => `app.config.json：${error}`)
  const config = result.config

  const expected = {
    'package.json': { name: config.projectName },
    'apps/desktop/package.json': {
      productName: config.productName,
      author: config.author,
      homepage: config.homepage,
      desktopName: `${config.projectName}.desktop`
    }
  }
  for (const [path, fields] of Object.entries(expected)) {
    let pkg
    try {
      pkg = (await readJsonFile(join(root, path))).value
    } catch (error) {
      problems.push(error.message)
      continue
    }
    for (const [field, value] of Object.entries(fields)) {
      if (pkg[field] !== value)
        problems.push(
          `${path} 的 ${field} 为 ${JSON.stringify(pkg[field])}，应为 ${JSON.stringify(value)}`
        )
    }
  }

  for (const path of [...identityFiles, ...(await workflowFiles(root))]) {
    const text = await readFile(join(root, path), 'utf8').catch(() => '')
    if (sourceResidue.test(text))
      problems.push(`${path} 仍包含来源应用的标识（${text.match(sourceResidue)[0]}）`)
  }

  if (release) {
    for (const field of configFields) {
      if (field !== 'repository' && config[field] === templateIdentity[field])
        problems.push(
          `发布前必须替换模板默认的 ${field}（${config[field]}），请运行 pnpm initialize`
        )
    }
    if (config.repository === null) {
      problems.push(
        '发布需要在 app.config.json 中配置 repository（owner/repo），否则已安装的应用无法更新'
      )
    } else if (repository && config.repository.toLowerCase() !== repository.toLowerCase()) {
      problems.push(
        `app.config.json 的 repository 为 ${config.repository}，但当前发布仓库是 ${repository}`
      )
    }
  }
  return problems
}

export async function main(argv, { root, stdout, stderr }) {
  let values
  try {
    ;({ values } = parseArgs({
      args: argv,
      options: { release: { type: 'boolean', default: false }, repository: { type: 'string' } },
      strict: true
    }))
  } catch (error) {
    stderr.write(
      `参数错误：${error.message}\n用法：check-identity [--release] [--repository owner/repo]\n`
    )
    return 2
  }
  const problems = await checkIdentity(root, values)
  if (problems.length > 0) {
    stderr.write(`产品标识检查失败：\n  - ${problems.join('\n  - ')}\n`)
    return 1
  }
  stdout.write(values.release ? '产品标识检查通过（发布模式）。\n' : '产品标识检查通过。\n')
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2), {
    root: dirname(dirname(fileURLToPath(import.meta.url))),
    stdout: process.stdout,
    stderr: process.stderr
  })
}
