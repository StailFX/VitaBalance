import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function inlineCssIntoHtml(): PluginOption {
  return {
    name: 'inline-css-into-html',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const htmlAsset = Object.values(bundle).find(
        (asset) => asset.type === 'asset' && asset.fileName === 'index.html'
      )

      if (!htmlAsset || typeof htmlAsset.source !== 'string') {
        return
      }

      const match = htmlAsset.source.match(/<link rel="stylesheet" crossorigin href="\/(assets\/[^"]+\.css)">/)
      if (!match) {
        return
      }

      const cssFileName = match[1]
      const cssAsset = bundle[cssFileName]

      if (!cssAsset || cssAsset.type !== 'asset') {
        return
      }

      const cssSource = String(cssAsset.source).replace(/<\/style/gi, '<\\/style')
      htmlAsset.source = htmlAsset.source.replace(match[0], `<style>${cssSource}</style>`)

      delete bundle[cssFileName]
    },
  }
}

function inlineEntryScriptIntoHtml(): PluginOption {
  return {
    name: 'inline-entry-script-into-html',
    apply: 'build',
    enforce: 'post',
    async writeBundle(outputOptions) {
      const outDir = resolve(outputOptions.dir ?? 'dist')
      const htmlPath = resolve(outDir, 'index.html')
      const htmlSource = await fs.readFile(htmlPath, 'utf8')

      const match = htmlSource.match(
        /<script type="module" crossorigin src="\/(assets\/index-[^"]+\.js)"><\/script>/
      )

      if (!match) {
        return
      }

      const entryFileName = match[1]
      const entryPath = resolve(outDir, entryFileName)
      const entrySource = (await fs.readFile(entryPath, 'utf8'))
        .replace(/from"\.\//g, 'from"/assets/')
        .replace(/from'\.\//g, "from'/assets/")
        .replace(/import\("\.\//g, 'import("/assets/')
        .replace(/import\('\.\//g, "import('/assets/")
        .replace(/import\(`\.\//g, 'import(`/assets/')
        .replace(/<\/script/gi, '<\\/script')

      const nextHtmlSource = htmlSource.replace(
        match[0],
        `<script type="module">${entrySource}</script>`
      )
        .replace(/\s*<link rel="modulepreload"[^>]+>\s*/g, '\n')

      await fs.writeFile(htmlPath, nextHtmlSource, 'utf8')
      await fs.unlink(entryPath)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), inlineCssIntoHtml(), inlineEntryScriptIntoHtml()],
  build: {
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/pages/Home.tsx') ||
            id.includes('/src/components/PublicLayout.tsx') ||
            id.includes('/src/components/LayoutFooter.tsx') ||
            id.includes('/src/components/PageTransition.tsx') ||
            id.includes('/src/components/home/') ||
            id.includes('/src/hooks/useAnimations.ts') ||
            id.includes('/src/hooks/useHasStoredToken.ts') ||
            id.includes('/src/hooks/useMediaQuery.ts')) {
            return 'home'
          }

          if (id.includes('/node_modules/react-router-dom/') ||
            id.includes('/node_modules/react-router/') ||
            id.includes('/node_modules/@remix-run/router/')) {
            return 'router'
          }

          if (id.includes('/node_modules/react-dom/')) {
            return 'react-dom'
          }

          if (id.includes('/node_modules/react/')) {
            return 'react-core'
          }

          return undefined
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
