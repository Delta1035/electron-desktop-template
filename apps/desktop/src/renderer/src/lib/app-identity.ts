import config from '../../../../../../app.config.json'

/** Build-time product identity from app.config.json, for UI shown before the core answers. */
export const appIdentity = { productName: config.productName, appId: config.appId }
