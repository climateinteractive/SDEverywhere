// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { dirname, relative, join as joinPath, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig } from 'vite'
// import globPlugin from 'vite-plugin-glob'

// import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import rollupNodePolyFill from 'rollup-plugin-node-polyfills'

import type { SuiteSummary } from '@sdeverywhere/check-core'

import type { CheckPluginOptions } from './options'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function createViteConfigForReport(
  options: CheckPluginOptions | undefined,
  prepDir: string,
  currentBundlePath: string,
  testConfigPath: string,
  suiteSummary: SuiteSummary | undefined
): InlineConfig {
  // Use `template-report` as the root directory for the report project
  const root = resolvePath(__dirname, '..', 'template-report')

  // Calculate output directory relative to the template root
  let reportPath: string
  if (options?.reportPath) {
    reportPath = options.reportPath
  } else {
    reportPath = joinPath(prepDir, 'check-report')
  }
  const outDir = relative(root, reportPath)

  // Convert the suite summary to JSON, which is what the app currently expects
  const suiteSummaryJson = suiteSummary ? JSON.stringify(suiteSummary) : ''

  return {
    // Don't use an external config file
    configFile: false,

    // Use the root directory configured above
    root,

    // Use `.` as the base directory (instead of the default `/`); this controls
    // how the path to the js/css files are generated in `index.html`
    base: '',

    // Load static files from `static` (instead of the default `public`)
    // publicDir: 'static',

    // Don't clear the screen in dev mode so that we can see builder output
    clearScreen: false,

    // TODO
    // logLevel: 'silent',

    optimizeDeps: {
      // Prevent Vite from examining other html files when scanning entrypoints
      // for dependency optimization
      entries: ['index.html']

      // esbuildOptions: {
      //   // Include polyfills
      //   plugins: [NodeModulesPolyfillPlugin()]
      // }
    },

    // Configure path aliases
    resolve: {
      alias: {
        // Use the configured "baseline" bundle if defined, otherwise use the "empty" bundle
        // (which will cause comparison tests to be skipped)
        '@_baseline_bundle_': options?.baseline ? options.baseline.path : '/src/empty-bundle.ts',

        // Use the configured "current" bundle
        '@_current_bundle_': currentBundlePath,

        // Use the configured test config file
        '@_test_config_': testConfigPath,

        // Make the overlay use the `messages.html` file that is written to the prep directory
        '@_prep_': prepDir,

        // XXX: Include polyfills for these modules that are used in the Node-specific
        // implementation of threads.js; this allows us to use one bundle that works
        // in both Node and browser environments
        events: 'rollup-plugin-node-polyfills/polyfills/events',
        os: 'rollup-plugin-node-polyfills/polyfills/os',
        path: 'rollup-plugin-node-polyfills/polyfills/path',
        // XXX: The following is only needed due to threads.js 1.7.0 importing `fileURLToPath`.
        // We use a no-op polyfill of our own for the time being.
        url: '/src/url-polyfill.ts'
      }
    },

    // Inject special values into the generated JS
    define: {
      // Inject the summary JSON into the build
      __SUITE_SUMMARY_JSON__: JSON.stringify(suiteSummaryJson),

      // Inject the baseline branch name
      __BASELINE_NAME__: JSON.stringify(options?.baseline?.name || ''),

      // Inject the current branch name
      __CURRENT_NAME__: JSON.stringify(options?.current?.name || '')
    },

    plugins: [
      // Use `vite-plugin-glob` instead of Vite's built-in `import.meta.globEager`
      // because the plugin does a better job of handling HMR when the yaml files
      // are outside of the `template-report` app root directory.
      // globPlugin(),
    ],

    build: {
      // Write output files to the configured directory (instead of the default `dist`);
      // note that this must be relative to the project `root`
      outDir,

      // Write js/css files to `public` (instead of the default `<outDir>/assets`)
      assetsDir: '',

      rollupOptions: {
        output: {
          // XXX: Prevent vite from creating a separate `vendor.js` file
          manualChunks: undefined
        },

        plugins: [
          // Enable Node polyfills for production build (see resolve.alias
          // section above)
          rollupNodePolyFill()
        ],

        onwarn: (warning, warn) => {
          // XXX: Suppress "Use of eval is strongly discouraged" warnings that are
          // triggered by use of the following pattern in threads.js:
          //   eval("require")("worker_threads")
          // It would be nice to avoid use of `eval` there, but it's not critical for
          // our use case so we will suppress the warnings for now
          if (warning.code !== 'EVAL') {
            warn(warning)
          }
        }
      }
    },

    server: {
      // Run the dev server at `localhost:8081` by default
      port: options?.serverPort || 8081,

      // Open the app in the browser by default
      open: '/index.html',

      // XXX: Add a small delay, otherwise on macOS we sometimes get multiple
      // change events when a file is saved just once.  That is a relatively
      // harmless issue except that it causes redundant messages in the console
      // and can cause extra churn when refreshing the app.
      watch: {
        awaitWriteFinish: {
          stabilityThreshold: 100
        }
      }
    }
  }
}
