import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { browserslistToTargets } from 'lightningcss'
import browserslist from 'browserslist'
import { resolve } from 'node:path'

const targets = browserslistToTargets(browserslist('chrome 103'))

export default defineConfig({
  root: 'web',
  plugins: [svelte()],
  resolve: { alias: { '@shared': resolve(__dirname, 'shared') } },
  css: { transformer: 'lightningcss', lightningcss: { targets } },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'chrome103',
    cssTarget: 'chrome103',
    cssMinify: 'lightningcss',
    rollupOptions: {
      input: {
        control: resolve(__dirname, 'web/control.html'),
        out: resolve(__dirname, 'web/out.html'),
        multiview: resolve(__dirname, 'web/multiview.html'),
      },
    },
  },
})
