import { dirname, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const production = process.env.NODE_ENV === 'production'

// Note that Vite tries to inject `__dirname` but if we leave it undefined then
// Node will complain ("ERROR: __dirname is not defined in ES module scope") so
// we use our own special name here
const appDir = dirname(fileURLToPath(import.meta.url))

function localPackage(...subpath) {
  return resolvePath(appDir, '..', '..', 'packages', ...subpath)
}

export default defineConfig({
  // Don't clear the screen in dev mode so that we can see builder output
  clearScreen: false,

  // Use `.` as the base directory (instead of the default `/`); this controls
  // how the path to the js/css files are generated in `index.html`
  base: '',

  // Load static files from `static` (instead of the default `public`)
  publicDir: 'static',

  // Configure path aliases; these should match the corresponding lines in `tsconfig-base.json`
  resolve: {
    alias: {
      '@sdeverywhere/compile': localPackage('compile', 'src'),
      '@sdeverywhere/runtime': localPackage('runtime', 'src')
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
    svelte(),

    // XXX: Polyfill certain Node.js core modules until the compile package is
    // updated to have a browser-friendly implementation
    nodePolyfills()
  ],

  server: {
    // Run the dev server at `localhost:8088` by default
    port: 8088,

    // Open the app in the browser by default
    open: '/index.html'
  }
})
