import { dirname, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import { defineConfig } from 'vite'

// Note that Vite tries to inject `__dirname` but if we leave it undefined then
// Node will complain ("ERROR: __dirname is not defined in ES module scope") so
// we use our own special name here
const testsDir = dirname(fileURLToPath(import.meta.url))

function localPackage(...subpath) {
  return resolvePath(testsDir, '..', '..', 'packages', ...subpath)
}

export default defineConfig({
  // Only build the library in production mode (dev mode is not applicable)
  mode: 'production',

  // Don't clear the screen
  clearScreen: false,

  resolve: {
    alias: {
      // Configure path aliases; these should match the corresponding lines in `tsconfig-base.json`
      '@sdeverywhere/check-core': localPackage('check-core', 'src')
    }
  },

  build: {
    // Write output file to `dist/index.js`
    outDir: 'dist',
    emptyOutDir: false,

    // TODO: Uncomment for debugging purposes
    // minify: false,

    lib: {
      entry: './src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js'
    }
  }
})
