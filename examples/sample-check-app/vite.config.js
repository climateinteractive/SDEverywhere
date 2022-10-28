import { dirname, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const production = process.env.NODE_ENV === 'production'

// Note that Vite tries to inject `__dirname` but if we leave it undefined then
// Node will complain ("ERROR: __dirname is not defined in ES module scope") so
// we use our own special name here
const appDir = dirname(fileURLToPath(import.meta.url))

// Returns the content of the `suite-summary.json` file if this is a
// "production" build, otherwise returns an empty string (in which case,
// the checks will be run in the browser).
function suiteSummaryJson() {
  // TODO: Use the 'suite-summary.json' if available
  // if (production) {
  //   return readFileSync('suite-summary.json', 'utf8')
  // } else {
  //   return ''
  // }
  return ''
}

function localPackage(...subpath) {
  return resolvePath(appDir, '..', '..', 'packages', ...subpath)
}

function localExample(...subpath) {
  return resolvePath(appDir, '..', ...subpath)
}

export default defineConfig({
  // Don't clear the screen in dev mode so that we can see builder output
  clearScreen: false,

  // Use `.` as the base directory (instead of the default `/`); this controls
  // how the path to the js/css files are generated in `index.html`
  base: '',

  // Load static files from `static` (instead of the default `public`)
  publicDir: 'static',

  // XXX: Prevent Vite from prebundling the local packages
  optimizeDeps: {
    exclude: ['@sdeverywhere/check-core', '@sdeverywhere/check-ui-shell']
  },

  // Configure path aliases; these should match the corresponding lines in `tsconfig-base.json`
  resolve: {
    alias: {
      '@sdeverywhere/check-core': localPackage('check-core', 'src'),
      '@sdeverywhere/check-ui-shell': localPackage('check-ui-shell', 'src'),
      '@sdeverywhere/sample-check-tests': localExample('sample-check-tests', 'src')
    }
  },

  // Inject special values into the generated JS
  define: {
    // Set a flag to indicate that this is a production build
    __PRODUCTION__: production,

    // Inject the summary JSON into the build
    __SUITE_SUMMARY_JSON__: JSON.stringify(suiteSummaryJson())
  },

  json: {
    // Setting this to true makes builds faster; the only JSON files we currently import
    // are the locale definitions from `d3-format`, but this improves build time slightly
    stringify: true
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
    port: 8081,

    // Open the app in the browser by default
    open: '/index.html'
  }
})
