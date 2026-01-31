import { readFileSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

import { defineConfig } from 'vite'

import { svelte } from '@sveltejs/vite-plugin-svelte'

// Note that Vite tries to inject `__dirname` but if we leave it undefined then
// Node will complain ("ERROR: __dirname is not defined in ES module scope") so
// we use our own special name here
const libDir = dirname(fileURLToPath(import.meta.url))

const pkg = JSON.parse(readFileSync('package.json'))

export default defineConfig({
  // Only build the library in production mode (dev mode is not applicable)
  mode: 'production',

  // Use this directory as the root directory for the library
  root: libDir,

  // Don't clear the screen
  clearScreen: false,

  plugins: [
    // Process Svelte files
    svelte({ emitCss: false })
  ],

  build: {
    // Write output file to `dist/index.js`
    outDir: 'dist',

    // TODO: Uncomment for debugging purposes
    // minify: false,

    lib: {
      entry: './src/index.ts',
      formats: ['es'],
      fileName: 'index',
      // NOTE: The plugin-check template assumes that the CSS file is named `style.css`,
      // so if changing the name here, be sure to update the template as well
      cssFileName: 'style'
    },

    rollupOptions: {
      // Prevent dependencies from being included in packaged library
      external: Object.keys(pkg.dependencies)
    }
  }
})
