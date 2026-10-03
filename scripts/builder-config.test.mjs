import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createBuilderConfig, installerWrapper, writeInstallerWrapper } from './builder-config.mjs'

const config = {
  projectName: 'my-tool',
  productName: '我的工具',
  appId: 'com.example.mytool',
  author: 'Example',
  homepage: 'https://example.com/my-tool',
  repository: 'owner/my-tool'
}

test('derives every packaged identity from the app config', () => {
  const builder = createBuilderConfig(config, { installerInclude: 'wrapper.nsh' })
  assert.equal(builder.appId, 'com.example.mytool')
  assert.equal(builder.productName, '我的工具')
  assert.deepEqual(builder.extraMetadata, { name: 'my-tool' })
  assert.equal(builder.win.executableName, 'my-tool')
  assert.equal(builder.linux.executableName, 'my-tool')
  assert.equal(builder.linux.maintainer, 'Example')
  assert.equal(builder.deb.packageName, 'my-tool')
  assert.equal(builder.nsis.include, 'wrapper.nsh')
  // electron-builder expands these macros; the project name is fixed at config time.
  assert.equal(builder.nsis.artifactName, 'my-tool-${version}-setup.${ext}')
  assert.equal(builder.appImage.artifactName, 'my-tool-${version}.${ext}')
  assert.equal(builder.deb.artifactName, 'my-tool_${version}_${arch}.${ext}')
  assert.deepEqual(builder.publish, {
    provider: 'github',
    owner: 'owner',
    repo: 'my-tool',
    releaseType: 'release'
  })
})

test('disables publishing explicitly without a repository', () => {
  const builder = createBuilderConfig({ ...config, repository: null }, { installerInclude: 'x' })
  // undefined would let electron-builder infer a feed from the git remote.
  assert.equal(builder.publish, null)
})

test('the installer wrapper defines the install folder before including the script', async () => {
  assert.equal(
    installerWrapper(config, 'C:\\app\\build\\installer.nsh'),
    '; Generated from app.config.json by electron-builder.config.mjs. Do not edit.\r\n' +
      '!define APP_INSTALL_DIR_NAME "my-tool"\r\n' +
      '!include "C:\\app\\build\\installer.nsh"\r\n'
  )
  const appDir = await mkdtemp(join(tmpdir(), 'builder-config-'))
  try {
    const path = await writeInstallerWrapper(config, appDir)
    assert.equal(path, join(appDir, 'build', 'generated', 'installer.nsh'))
    assert.match(await readFile(path, 'utf8'), /APP_INSTALL_DIR_NAME "my-tool"/)
  } finally {
    await rm(appDir, { recursive: true, force: true })
  }
})
