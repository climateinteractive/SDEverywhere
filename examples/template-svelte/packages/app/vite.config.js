import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const production = process.env.NODE_ENV === 'production'

// Note that Vite tries to inject `__dirname` but if we leave it undefined then
// Node will complain ("ERROR: __dirname is not defined in ES module scope") so
// we use our own special name here
const appDir = dirname(fileURLToPath(import.meta.url))
const projDir = resolve(appDir, '..', '..')

export default defineConfig({
  // Don't clear the screen in dev mode so that we can see builder output
  clearScreen: false,

  // Use this directory as the root directory for the app project
  root: appDir,

  // Use `.` as the base directory (instead of the default `/`); this controls
  // how the path to the js/css files are generated in `index.html`
  base: '',

  // Load static files from `static` (instead of the default `public`)
  publicDir: 'static',

  // Configure path aliases; these should match the corresponding lines in `tsconfig-base.json`
  resolve: {
    alias: {
      '@core': resolve(appDir, '..', 'core', 'src'),
      '@core-strings': resolve(appDir, '..', 'core', 'strings'),
      '@prep': resolve(projDir, 'sde-prep')
    }
  },

  // Inject special values into the generated JS
  define: {
    // Set a flag to indicate that this is a production build
    __PRODUCTION__: production
  },

  // Post-process CSS
  css: {
    postcss: {
      minimize: true,
      use: [['sass']]
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

  plugins: [
    // Process Svelte files
    svelte()
  ],

  server: {
    // Run the dev server at `localhost:8081` by default
    port: 8088,

    // Open the app in the browser by default
    open: '/index.html'
  }
})
