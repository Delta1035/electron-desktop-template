import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readAppConfig } from '../../scripts/app-config.mjs'
import { createBuilderConfig, writeInstallerWrapper } from '../../scripts/builder-config.mjs'

// Packaging reads the product identity from app.config.json; edit that file, not this one.
const appDir = dirname(fileURLToPath(import.meta.url))
const config = await readAppConfig(join(appDir, '..', '..'))

export default createBuilderConfig(config, {
  installerInclude: await writeInstallerWrapper(config, appDir)
})
