import { access, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readAppConfig, readJsonFile } from './app-config.mjs'

/** What a package build must produce for this identity, relative to apps/desktop/dist. */
export function expectedArtifacts(config, version, platform) {
  const name = config.projectName
  if (platform === 'win32') {
    return {
      installers: [`${name}-${version}-setup.exe`],
      executable: join('win-unpacked', `${name}.exe`),
      updateConfig: join('win-unpacked', 'resources', 'app-update.yml')
    }
  }
  if (platform === 'linux') {
    return {
      installers: [`${name}-${version}.AppImage`, `${name}_${version}_amd64.deb`],
      executable: join('linux-unpacked', name),
      updateConfig: join('linux-unpacked', 'resources', 'app-update.yml')
    }
  }
  throw new Error(`不支持校验 ${platform} 安装包；目标平台为 Windows 与 Linux`)
}

const exists = (path) =>
  access(path).then(
    () => true,
    () => false
  )

/** Checks real build output: installer names, executable name and the update feed. */
export async function verifyPackage(root, platform) {
  const config = await readAppConfig(root)
  const { value: pkg } = await readJsonFile(join(root, 'apps', 'desktop', 'package.json'))
  const dist = join(root, 'apps', 'desktop', 'dist')
  const expected = expectedArtifacts(config, pkg.version, platform)
  const problems = []
  for (const file of [...expected.installers, expected.executable]) {
    if (!(await exists(join(dist, file)))) problems.push(`缺少 ${file}`)
  }
  const updateConfig = await readFile(join(dist, expected.updateConfig), 'utf8').catch(() => null)
  if (config.repository === null && updateConfig !== null) {
    problems.push(`未配置 repository，但安装包仍包含更新源 ${expected.updateConfig}`)
  } else if (config.repository !== null) {
    const [owner, repo] = config.repository.split('/')
    const lines = updateConfig?.split(/\r?\n/) ?? []
    if (!lines.includes(`owner: ${owner}`) || !lines.includes(`repo: ${repo}`))
      problems.push(`${expected.updateConfig} 未指向 ${config.repository}`)
  }
  return problems
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)))
  const problems = await verifyPackage(root, process.platform)
  if (problems.length > 0) {
    process.stderr.write(`安装包校验失败：\n  - ${problems.join('\n  - ')}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write('安装包产物与 app.config.json 一致。\n')
  }
}
