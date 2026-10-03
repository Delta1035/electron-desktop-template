import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import appConfig from '../../app.config.json'

const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

/** Fills the window title from app.config.json so the product name has a single source. */
function productNameTitle(): Plugin {
  const productName = appConfig.productName.replace(/[&<>"']/g, (char) => htmlEscapes[char]!)
  return {
    name: 'product-name-title',
    transformIndexHtml: (html: string) => html.replaceAll('%PRODUCT_NAME%', productName)
  }
}

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss(), productNameTitle()]
  }
})
