import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * NSIS cannot read app.config.json, so packaging writes a wrapper that defines the install
 * subfolder and then includes the static build/installer.nsh.
 */
export function installerWrapper(config, installerScript) {
  return [
    '; Generated from app.config.json by electron-builder.config.mjs. Do not edit.',
    `!define APP_INSTALL_DIR_NAME "${config.projectName}"`,
    `!include "${installerScript}"`,
    ''
  ].join('\r\n')
}

export async function writeInstallerWrapper(config, appDir) {
  const dir = join(appDir, 'build', 'generated')
  const path = join(dir, 'installer.nsh')
  await mkdir(dir, { recursive: true })
  await writeFile(path, installerWrapper(config, join(appDir, 'build', 'installer.nsh')), 'utf8')
  return path
}

/**
 * electron-builder configuration derived from the validated app config, so the installer,
 * executable and update feed always carry the same identity as the running app.
 */
export function createBuilderConfig(config, { installerInclude }) {
  const name = config.projectName
  const [owner, repo] = config.repository?.split('/') ?? []
  return {
    appId: config.appId,
    productName: config.productName,
    // The workspace package keeps its fixed @desktop/desktop name; electron-builder derives the
    // updater cache folder and the fallback install folder from the packaged name, so every app
    // built from this template would otherwise share them.
    extraMetadata: { name },
    directories: { buildResources: 'build' },
    files: [
      '!src/*',
      '!electron.vite.config.{js,ts,mjs,cjs}',
      '!electron-builder.config.mjs',
      '!vitest.config.{js,ts,mjs,cjs}',
      '!{.eslintcache,CHANGELOG.md,README.md}',
      '!{.env,.env.*,.npmrc,pnpm-lock.yaml}',
      '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json,tsconfig.e2e.json}',
      '!{e2e,test-results,playwright-report}/**',
      '!playwright.config.{js,ts,mjs,cjs}',
      '!{components.json,scripts/**}'
    ],
    asarUnpack: ['resources/**'],
    win: { executableName: name },
    nsis: {
      oneClick: false,
      // The custom directory page previews the normalized destination before installing.
      include: installerInclude,
      artifactName: `${name}-\${version}-setup.\${ext}`,
      shortcutName: '${productName}',
      uninstallDisplayName: '${productName}',
      createDesktopShortcut: 'always'
    },
    mac: { category: 'public.app-category.productivity' },
    linux: {
      target: ['AppImage', 'deb'],
      executableName: name,
      // Installs <projectName>.desktop to match desktopName, which Electron uses as app_id.
      syncDesktopName: true,
      maintainer: config.author,
      vendor: config.author,
      category: 'Utility'
    },
    appImage: { artifactName: `${name}-\${version}.\${ext}` },
    deb: { packageName: name, artifactName: `${name}_\${version}_\${arch}.\${ext}` },
    npmRebuild: false,
    // null disables publishing outright; left undefined, electron-builder would guess a feed
    // from the git remote. The release workflow uploads installers itself (--publish never).
    publish: config.repository ? { provider: 'github', owner, repo, releaseType: 'release' } : null
  }
}
