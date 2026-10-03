import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'
import { templateIdentity } from './app-config.mjs'
import { checkIdentity, main } from './check-identity.mjs'
import { main as initialize } from './initialize.mjs'

let root
const write = (path, value) => fs.writeFile(join(root, path), JSON.stringify(value, null, 2) + '\n')
const sink = () => ({
  text: '',
  write(chunk) {
    this.text += chunk
  }
})

async function initialized(repository) {
  const args = [
    '--project-name',
    'my-tool',
    '--product-name',
    'My Tool',
    '--app-id',
    'com.example.mytool',
    '--author',
    'Example',
    '--homepage',
    'https://example.com/my-tool',
    ...(repository ? ['--repository', repository] : []),
    '--yes'
  ]
  assert.equal(await initialize(args, { root, stdout: sink(), stderr: sink() }), 0)
}

beforeEach(async () => {
  root = await fs.mkdtemp(join(tmpdir(), 'check-identity-'))
  await fs.mkdir(join(root, 'apps', 'desktop'), { recursive: true })
  await write('app.config.json', templateIdentity)
  await write('package.json', { name: templateIdentity.projectName })
  await write('apps/desktop/package.json', {
    name: '@desktop/desktop',
    productName: templateIdentity.productName,
    author: templateIdentity.author,
    homepage: templateIdentity.homepage,
    desktopName: 'desktop-starter.desktop'
  })
})

afterEach(() => fs.rm(root, { recursive: true, force: true }))

test('the uninitialized template is consistent for development but not releasable', async () => {
  assert.deepEqual(await checkIdentity(root), [])
  const problems = await checkIdentity(root, { release: true })
  for (const field of ['projectName', 'productName', 'appId', 'author', 'homepage'])
    assert.ok(
      problems.some((problem) => problem.includes(`默认的 ${field}`)),
      field
    )
  assert.ok(problems.some((problem) => problem.includes('配置 repository')))
})

test('an initialized app with its own repository passes release checks', async () => {
  await initialized('owner/my-tool')
  assert.deepEqual(await checkIdentity(root, { release: true, repository: 'Owner/My-Tool' }), [])
  const stdout = sink()
  assert.equal(await main(['--release'], { root, stdout, stderr: sink() }), 0)
  assert.match(stdout.text, /发布模式/)
})

test('release fails when releasing from another repository', async () => {
  await initialized('owner/my-tool')
  const problems = await checkIdentity(root, { release: true, repository: 'fork/my-tool' })
  assert.deepEqual(problems, [
    'app.config.json 的 repository 为 owner/my-tool，但当前发布仓库是 fork/my-tool'
  ])
})

test('reports package fields that drifted from app.config.json', async () => {
  await initialized()
  const pkg = JSON.parse(await fs.readFile(join(root, 'apps/desktop/package.json'), 'utf8'))
  await write('apps/desktop/package.json', { ...pkg, productName: 'Renamed', desktopName: 'x' })
  const stderr = sink()
  assert.equal(await main([], { root, stdout: sink(), stderr }), 1)
  assert.match(stderr.text, /productName 为 "Renamed"，应为 "My Tool"/)
  assert.match(stderr.text, /desktopName 为 "x"，应为 "my-tool.desktop"/)
})

test('finds source app identifiers in workflows', async () => {
  await fs.mkdir(join(root, '.github', 'workflows'), { recursive: true })
  await fs.writeFile(join(root, '.github', 'workflows', 'release.yml'), 'repo: Delta1035/devhub\n')
  const problems = await checkIdentity(root)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /release.yml 仍包含来源应用的标识（Delta1035）/)
})

test('reports an invalid app.config.json and bad arguments clearly', async () => {
  await write('app.config.json', { ...templateIdentity, homepage: 'file:///x', extra: 1 })
  const problems = await checkIdentity(root)
  assert.ok(problems.some((problem) => problem.includes('未知字段 extra')))
  assert.ok(problems.some((problem) => problem.includes('homepage')))
  const stderr = sink()
  assert.equal(await main(['--publish'], { root, stdout: sink(), stderr }), 2)
  assert.match(stderr.text, /参数错误/)
})
