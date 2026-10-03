import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'
import { templateIdentity } from './app-config.mjs'
import { expectedArtifacts, verifyPackage } from './verify-package.mjs'

let root
const dist = (...parts) => join(root, 'apps', 'desktop', 'dist', ...parts)

async function touch(path, text = '') {
  await fs.mkdir(join(path, '..'), { recursive: true })
  await fs.writeFile(path, text)
}

async function configure(repository) {
  await fs.writeFile(
    join(root, 'app.config.json'),
    JSON.stringify({ ...templateIdentity, projectName: 'my-tool', repository })
  )
}

beforeEach(async () => {
  root = await fs.mkdtemp(join(tmpdir(), 'verify-package-'))
  await touch(join(root, 'apps', 'desktop', 'package.json'), JSON.stringify({ version: '1.2.3' }))
  await configure(null)
})

afterEach(() => fs.rm(root, { recursive: true, force: true }))

test('names the installers each platform must produce', () => {
  const config = { projectName: 'my-tool' }
  assert.deepEqual(expectedArtifacts(config, '1.2.3', 'win32').installers, [
    'my-tool-1.2.3-setup.exe'
  ])
  assert.deepEqual(expectedArtifacts(config, '1.2.3', 'linux').installers, [
    'my-tool-1.2.3.AppImage',
    'my-tool_1.2.3_amd64.deb'
  ])
  assert.throws(() => expectedArtifacts(config, '1.2.3', 'darwin'), /不支持/)
})

test('accepts complete Linux output without an update feed', async () => {
  await touch(dist('my-tool-1.2.3.AppImage'))
  await touch(dist('my-tool_1.2.3_amd64.deb'))
  await touch(dist('linux-unpacked', 'my-tool'))
  assert.deepEqual(await verifyPackage(root, 'linux'), [])
})

test('reports missing installers and an unexpected update feed', async () => {
  await touch(dist('win-unpacked', 'my-tool.exe'))
  await touch(
    dist('win-unpacked', 'resources', 'app-update.yml'),
    'owner: Delta1035\nrepo: devhub\n'
  )
  assert.deepEqual(await verifyPackage(root, 'win32'), [
    '缺少 my-tool-1.2.3-setup.exe',
    `未配置 repository，但安装包仍包含更新源 ${join('win-unpacked', 'resources', 'app-update.yml')}`
  ])
})

test('requires the update feed to point at the configured repository', async () => {
  await configure('owner/my-tool')
  await touch(dist('my-tool-1.2.3-setup.exe'))
  await touch(dist('win-unpacked', 'my-tool.exe'))
  const feed = dist('win-unpacked', 'resources', 'app-update.yml')
  await touch(feed, 'owner: other\nrepo: my-tool\n')
  assert.equal((await verifyPackage(root, 'win32')).length, 1)
  await touch(feed, 'owner: owner\nrepo: my-tool-fork\n')
  assert.equal((await verifyPackage(root, 'win32')).length, 1)
  await touch(feed, 'owner: owner\nrepo: my-tool\nprovider: github\n')
  assert.deepEqual(await verifyPackage(root, 'win32'), [])
})
