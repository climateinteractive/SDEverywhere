import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { defineConfig } from 'vite'

// Note that Vite tries to inject `__dirname` but if we leave it undefined then
// Node will complain ("ERROR: __dirname is not defined in ES module scope") so
// we use our own special name here
const appDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig(env => {
  return {
    // Don't clear the screen in dev mode so that we can see builder output
    clearScreen: false,

    // Use this directory as the root directory for the app project
    root: appDir,

    // Use `.` as the base directory (instead of the default `/`); this controls
    // how the path to the js/css files are generated in `index.html`
    base: '',

    // Load static files from `static` (instead of the default `public`)
    publicDir: 'static',

    // Inject special values into the generated JS
    define: {
      // Set a flag to indicate that this is a production build
      __PRODUCTION__: env.mode === 'production'
    },

    resolve: {
      alias: {
        '@core': resolve(appDir, '..', 'sir-core', 'src'),
        '@core-strings': resolve(appDir, '..', 'sir-core', 'strings')
      }
    },

    build: {
      // Write output files to `public` (instead of the default `dist`)
      outDir: 'public',

      // Write js/css files to `public` (instead of the default `<outDir>/assets`)
      assetsDir: '',

      // TODO: Uncomment for debugging purposes
      // minify: false,

      rollupOptions: {
        output: {
          // XXX: Prevent vite from creating a separate `vendor.js` file
          manualChunks: undefined
        }
      }
    },

    server: {
      // Run the dev server at `localhost:8091` by default
      port: 8091,

      // Open the app in the browser by default
      open: '/index.html'
    }
  }
})
