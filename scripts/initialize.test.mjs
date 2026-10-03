import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'
import { templateIdentity } from './app-config.mjs'
import { exitCode, main, managedFiles } from './initialize.mjs'

const args = [
  '--project-name',
  'my-tool',
  '--product-name',
  '我的工具',
  '--app-id',
  'com.example.mytool',
  '--author',
  'Example',
  '--homepage',
  'https://example.com/my-tool'
]

let root

const write = (path, value, eol = '\n') =>
  fs.writeFile(join(root, path), JSON.stringify(value, null, 2).replaceAll('\n', eol) + eol)
const readJson = async (path) => JSON.parse(await fs.readFile(join(root, path), 'utf8'))
const snapshot = () =>
  Promise.all(managedFiles.map((path) => fs.readFile(join(root, path), 'utf8')))

function output() {
  let text = ''
  return { write: (chunk) => (text += chunk), text: () => text }
}

async function run(argv, overrides = {}) {
  const stdout = output()
  const stderr = output()
  const code = await main(argv, { root, stdout, stderr, ...overrides })
  return { code, stdout: stdout.text(), stderr: stderr.text() }
}

beforeEach(async () => {
  root = await fs.mkdtemp(join(tmpdir(), 'initialize-'))
  await fs.mkdir(join(root, 'apps', 'desktop'), { recursive: true })
  await write('app.config.json', templateIdentity)
  await write('package.json', { name: templateIdentity.projectName, private: true })
  await write('apps/desktop/package.json', {
    name: '@desktop/desktop',
    productName: templateIdentity.productName,
    version: '0.0.0',
    homepage: templateIdentity.homepage,
    author: templateIdentity.author,
    desktopName: 'desktop-starter.desktop',
    main: './out/main/index.js'
  })
})

afterEach(() => fs.rm(root, { recursive: true, force: true }))

test('previews without --yes and writes nothing', async () => {
  const before = await snapshot()
  const result = await run(args)
  assert.equal(result.code, exitCode.ok)
  assert.match(result.stdout, /appId: "com.example.desktopstarter" -> "com.example.mytool"/)
  assert.match(result.stdout, /预览模式/)
  assert.deepEqual(await snapshot(), before)
})

test('writes a consistent identity to every managed file', async () => {
  const result = await run([...args, '--repository', 'owner/my-tool', '--yes'])
  assert.equal(result.code, exitCode.ok, result.stderr)
  assert.deepEqual(await readJson('app.config.json'), {
    projectName: 'my-tool',
    productName: '我的工具',
    appId: 'com.example.mytool',
    author: 'Example',
    homepage: 'https://example.com/my-tool',
    repository: 'owner/my-tool'
  })
  assert.equal((await readJson('package.json')).name, 'my-tool')
  const desktop = await readJson('apps/desktop/package.json')
  assert.equal(desktop.name, '@desktop/desktop')
  assert.equal(desktop.productName, '我的工具')
  assert.equal(desktop.author, 'Example')
  assert.equal(desktop.homepage, 'https://example.com/my-tool')
  assert.equal(desktop.desktopName, 'my-tool.desktop')
  // Unrelated fields and their order survive.
  assert.deepEqual(Object.keys(desktop), [
    'name',
    'productName',
    'version',
    'homepage',
    'author',
    'desktopName',
    'main'
  ])
  const leftovers = (await fs.readdir(root, { recursive: true })).filter((name) =>
    name.endsWith('.tmp')
  )
  assert.deepEqual(leftovers, [])
})

test('running again with the same values changes nothing', async () => {
  assert.equal((await run([...args, '--yes'])).code, exitCode.ok)
  const before = await snapshot()
  const stats = await Promise.all(managedFiles.map((path) => fs.stat(join(root, path))))
  const again = await run([...args, '--yes'])
  assert.equal(again.code, exitCode.ok)
  assert.match(again.stdout, /未修改任何文件/)
  assert.deepEqual(await snapshot(), before)
  const after = await Promise.all(managedFiles.map((path) => fs.stat(join(root, path))))
  assert.deepEqual(
    after.map((stat) => stat.mtimeMs),
    stats.map((stat) => stat.mtimeMs)
  )
})

test('keeps CRLF line endings', async () => {
  await write('package.json', { name: templateIdentity.projectName, private: true }, '\r\n')
  assert.equal((await run([...args, '--yes'])).code, exitCode.ok)
  const text = await fs.readFile(join(root, 'package.json'), 'utf8')
  assert.equal(text, '{\r\n  "name": "my-tool",\r\n  "private": true\r\n}\r\n')
})

test('rejects missing, unknown and invalid arguments without writing', async () => {
  const before = await snapshot()
  const missing = await run(['--project-name', 'my-tool', '--yes'])
  assert.equal(missing.code, exitCode.invalid)
  assert.match(missing.stderr, /缺少必填参数：--product-name、--app-id、--author、--homepage/)

  const unknown = await run([...args, '--name', 'x'])
  assert.equal(unknown.code, exitCode.invalid)
  assert.match(unknown.stderr, /参数错误/)

  const invalid = await run([
    '--project-name',
    'My Tool',
    '--product-name',
    'a/b',
    '--app-id',
    'MyTool',
    '--author',
    ' ',
    '--homepage',
    'ftp://example.com',
    '--repository',
    'not-a-repo',
    '--yes'
  ])
  assert.equal(invalid.code, exitCode.invalid)
  for (const field of ['projectName', 'productName', 'appId', 'author', 'homepage', 'repository'])
    assert.match(invalid.stderr, new RegExp(field))
  assert.deepEqual(await snapshot(), before)
})

test('rejects the template default appId and the source app identity', async () => {
  const defaults = await run([
    ...args.slice(0, 4),
    '--app-id',
    templateIdentity.appId,
    ...args.slice(6)
  ])
  assert.equal(defaults.code, exitCode.invalid)
  assert.match(defaults.stderr, /模板默认值/)

  const source = await run([
    ...args,
    '--repository',
    'Delta1035/devhub',
    '--app-id',
    'com.devhub.desktop'
  ])
  assert.equal(source.code, exitCode.invalid)
  assert.match(source.stderr, /appId "com.devhub.desktop"/)
  assert.match(source.stderr, /来源应用的仓库/)
})

test('changing an initialized appId requires explicit confirmation', async () => {
  assert.equal((await run([...args, '--yes'])).code, exitCode.ok)
  const changed = args.map((value) =>
    value === 'com.example.mytool' ? 'com.example.other' : value
  )
  const refused = await run([...changed, '--yes'])
  assert.equal(refused.code, exitCode.invalid)
  assert.match(refused.stderr, /数据目录和安装身份/)
  assert.equal((await readJson('app.config.json')).appId, 'com.example.mytool')

  const allowed = await run([...changed, '--yes', '--allow-app-id-change'])
  assert.equal(allowed.code, exitCode.ok, allowed.stderr)
  assert.match(allowed.stdout, /旧数据不会自动迁移/)
  assert.equal((await readJson('app.config.json')).appId, 'com.example.other')
})

test('refuses directories that are not this template', async () => {
  await write('apps/desktop/package.json', { name: '@other/app', productName: 'Other' })
  const foreign = await run([...args, '--yes'])
  assert.equal(foreign.code, exitCode.invalid)
  assert.match(foreign.stderr, /拒绝修改/)

  await fs.rm(join(root, 'app.config.json'))
  const missing = await run([...args, '--yes'])
  assert.equal(missing.code, exitCode.invalid)
  assert.match(missing.stderr, /文件不存在/)
})

test('refuses hand-edited identity drift', async () => {
  await write('package.json', { name: 'renamed', private: true })
  const result = await run([...args, '--yes'])
  assert.equal(result.code, exitCode.invalid)
  assert.match(result.stderr, /package.json 的 name 与 app.config.json 的 projectName 不一致/)
  assert.match(result.stderr, /git checkout --/)
})

test('a failed staging write leaves every file untouched', async () => {
  const before = await snapshot()
  let writes = 0
  const failing = {
    ...fs,
    writeFile: async (...params) => {
      if (++writes === 2)
        throw Object.assign(new Error('ENOSPC: no space left'), { code: 'ENOSPC' })
      return fs.writeFile(...params)
    }
  }
  const result = await run([...args, '--yes'], { fs: failing })
  assert.equal(result.code, exitCode.writeFailed)
  assert.match(result.stderr, /未修改任何文件：ENOSPC/)
  assert.deepEqual(await snapshot(), before)
  assert.deepEqual(
    (await fs.readdir(root, { recursive: true })).filter((name) => name.endsWith('.tmp')),
    []
  )
})

test('a failed replacement restores the files already written', async () => {
  const before = await snapshot()
  let renames = 0
  const failing = {
    ...fs,
    rename: async (...params) => {
      if (++renames === 2)
        throw Object.assign(new Error('EPERM: file is locked'), { code: 'EPERM' })
      return fs.rename(...params)
    }
  }
  const result = await run([...args, '--yes'], { fs: failing })
  assert.equal(result.code, exitCode.writeFailed)
  assert.match(result.stderr, /替换 package.json 失败：EPERM/)
  assert.match(result.stderr, /项目保持原状/)
  assert.deepEqual(await snapshot(), before)
  // The restored project is still a valid template and can be initialized normally.
  assert.equal((await run([...args, '--yes'])).code, exitCode.ok)
})

test('reports files it could not restore with recovery steps', async () => {
  let renames = 0
  let restoring = false
  const failing = {
    ...fs,
    rename: async (...params) => {
      if (++renames === 2) {
        restoring = true
        throw new Error('EPERM: file is locked')
      }
      return fs.rename(...params)
    },
    writeFile: async (...params) => {
      if (restoring) throw new Error('EACCES: permission denied')
      return fs.writeFile(...params)
    }
  }
  const result = await run([...args, '--yes'], { fs: failing })
  assert.equal(result.code, exitCode.writeFailed)
  assert.match(result.stderr, /未能恢复：app.config.json/)
  assert.match(
    result.stderr,
    /git checkout -- app.config.json package.json apps\/desktop\/package.json/
  )
})
