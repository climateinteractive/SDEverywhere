// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { dirname, relative, join as joinPath, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { Alias, InlineConfig } from 'vite'

import type { SuiteSummary } from '@sdeverywhere/check-core'

import type { CheckPluginOptions } from './options'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function createViteConfigForReport(
  options: CheckPluginOptions | undefined,
  prepDir: string,
  currentBundleName: string,
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

  const alias = (find: string, replacement: string) => {
    return {
      find,
      replacement
    } as Alias
  }

  // XXX: This provides custom handling for Node built-ins such as 'events' that are
  // referenced by the check bundle (specifically in the Node implementation of
  // threads.js).  These are not actually used in the browser, so we just need
  // to provide no-op polyfills for these.
  const noopPolyfillAlias = (find: string) => {
    return {
      find,
      replacement: '/polyfills/noop-polyfills.ts'
    } as Alias
  }

  return {
    // Don't use an external config file
    configFile: false,

    // Use the root directory configured above
    root,

    // Use `.` as the base directory (instead of the default `/`); this controls
    // how the path to the js/css files are generated in `index.html`
    base: '',

    // Use a custom cache directory under `prepDir`, as otherwise Vite will use
    // `packages/plugin-check/template-report/node_modules/.vite`, and we want to
    // avoid generating files in `template-report` (which should be read-only)
    cacheDir: joinPath(prepDir, '.vite-check-report'),

    // Load static files from `static` (instead of the default `public`)
    // publicDir: 'static',

    // Don't clear the screen in dev mode so that we can see builder output
    clearScreen: false,

    // TODO
    // logLevel: 'silent',

    optimizeDeps: {
      // Prevent Vite from examining other html files when scanning entrypoints
      // for dependency optimization
      entries: ['index.html'],

      // XXX: When plugin-check is installed via pnpm, the Vite dev server seems
      // to have no trouble resolving other dependencies using the optimizeDeps
      // mechanism.  However, this fails when the package is installed via yarn
      // or npm (probably due to the fact that the `template-report` directory
      // is located under the top-level `node_modules` directory); in the browser,
      // there will be "import not found" errors for the packages referenced below.
      // As a terrible workaround, explicitly include the direct dependencies so
      // that Vite optimizes them; this works for pnpm, yarn, and npm.  We should
      // find a less fragile solution.
      include: [
        // from check-core
        'assert-never',
        'ajv',
        'neverthrow',
        'yaml',
        // from check-ui-shell
        'fontfaceobserver',
        'copy-text-to-clipboard',
        'chart.js'
      ],

      exclude: [
        // XXX: The threads.js implementation references `tiny-worker` as an optional
        // dependency, but it doesn't get used at runtime, so we can just exclude it
        // so that Vite doesn't complain in dev mode
        'tiny-worker',

        // XXX: Similarly, chart.js treats `moment` as an optional dependency, but we
        // don't use it at runtime; we need to exclude it here, otherwise Vite will
        // complain about missing dependencies in dev mode
        'moment'
      ]
    },

    // Configure path aliases
    resolve: {
      alias: [
        // Use the configured "baseline" bundle if defined, otherwise use the "empty" bundle
        // (which will cause comparison tests to be skipped)
        alias('@_baseline_bundle_', options?.baseline ? options.baseline.path : '/src/empty-bundle.ts'),

        // Use the configured "current" bundle
        alias('@_current_bundle_', currentBundlePath),

        // Use the configured test config file
        alias('@_test_config_', testConfigPath),

        // Make the overlay use the `messages.html` file that is written to the prep directory
        alias('@_prep_', prepDir),

        // XXX: Include no-op polyfills for these modules that are used in the Node-specific
        // implementation of threads.js; this allows us to use one bundle that works in both
        // Node and browser environments
        noopPolyfillAlias('events'),
        noopPolyfillAlias('os'),
        noopPolyfillAlias('path'),
        noopPolyfillAlias('url')
      ]
    },

    // Inject special values into the generated JS
    define: {
      // Inject the summary JSON into the build
      __SUITE_SUMMARY_JSON__: JSON.stringify(suiteSummaryJson),

      // Inject the baseline branch name
      __BASELINE_NAME__: JSON.stringify(options?.baseline?.name || ''),

      // Inject the current branch name
      __CURRENT_NAME__: JSON.stringify(currentBundleName)
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
