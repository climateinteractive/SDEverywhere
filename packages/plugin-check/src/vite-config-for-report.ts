// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, mkdirSync } from 'node:fs'
import { dirname, relative, join as joinPath, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Alias, InlineConfig } from 'vite'

import type { SuiteSummary } from '@sdeverywhere/check-core'

import type { LocalBundleSpec } from './bundle-spec'
import type { CheckPluginOptions } from './options'
import { localBundlesPlugin } from './vite-local-bundles-plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * NOTE: This function currently only supports creating a Vite config for the
 * model-check report when the current/baseline bundles are local files.  If
 * you want to use remote bundles, you must first download them to the local
 * `bundles` directory and then pass `LocalBundleSpec` instances that include
 * the local bundle file paths.
 */
export function createViteConfigForReport(
  mode: 'bundle' | 'watch',
  options: CheckPluginOptions | undefined,
  projDir: string,
  prepDir: string,
  currentBundleSpec: LocalBundleSpec,
  baselineBundleSpec: LocalBundleSpec | undefined,
  testConfigPath: string,
  suiteSummary: SuiteSummary | undefined
): InlineConfig {
  // Use `template-report` as the root directory for the report project
  const root = resolvePath(__dirname, '..', 'template-report')

  // Make sure the `bundles` directory exists.  This is required by the local bundles
  // plugin, which watches this directory for changes and scans it when the report app
  // asks for the list of available local bundles.
  // TODO: Use localBundlesPath from options
  const bundlesDir = resolvePath(projDir, 'bundles')
  if (!existsSync(bundlesDir)) {
    mkdirSync(bundlesDir, { recursive: true })
  }

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

  // XXX: This provides custom handling for the Node built-ins that are referenced by
  // check bundles that were built with an older version of plugin-check (which used
  // the threads.js package, whose Node implementation referenced these modules).
  // Bundles built with the current version don't reference these modules at all, but
  // we keep these no-op polyfills so that an older bundle can still be loaded as the
  // baseline bundle for comparison purposes.
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
        '@sdeverywhere/check-core > assert-never',
        '@sdeverywhere/check-core > ajv',
        '@sdeverywhere/check-core > neverthrow',
        '@sdeverywhere/check-core > yaml',
        // from check-ui-shell
        '@sdeverywhere/check-ui-shell > fontfaceobserver',
        '@sdeverywhere/check-ui-shell > copy-text-to-clipboard',
        '@sdeverywhere/check-ui-shell > chart.js'
      ],

      exclude: [
        // XXX: chart.js treats `moment` as an optional dependency, but we don't use
        // it at runtime; if it causes Vite to complain about missing dependencies in
        // dev mode, we can exclude it here
        // 'moment'
      ]
    },

    // Configure path aliases
    resolve: {
      alias: [
        // Use the configured "baseline" bundle if defined, otherwise use the "empty" bundle
        // (which will cause comparison tests to be skipped)
        alias('@_baseline_bundle_', baselineBundleSpec?.path || '/src/empty-bundle.ts'),

        // Use the configured "current" bundle
        alias('@_current_bundle_', currentBundleSpec.path),

        // Use the configured test config file
        alias('@_test_config_', testConfigPath),

        // Make the overlay use the `messages.html` file that is written to the prep directory
        alias('@_prep_', prepDir),

        // Include no-op polyfills for the Node built-ins that are referenced by check
        // bundles built with an older version of plugin-check (see above)
        noopPolyfillAlias('events'),
        noopPolyfillAlias('fs'),
        noopPolyfillAlias('os'),
        noopPolyfillAlias('path'),
        noopPolyfillAlias('url'),
        noopPolyfillAlias('worker_threads'),

        // XXX: The Node implementation of threads.js (used by check bundles built with
        // an older version of plugin-check) also has a `require('tiny-worker')` fallback
        // that is never taken in the browser.  Rollup ignored `require` calls in an ES
        // module, but Rolldown (used by Vite 8+) resolves them, and an unresolved import
        // is a hard error, so point this at the no-op polyfill as well.
        noopPolyfillAlias('tiny-worker')
      ]
    },

    // Inject special values into the generated JS
    define: {
      // Inject the summary JSON into the build
      __SUITE_SUMMARY_JSON__: JSON.stringify(suiteSummaryJson),

      // Inject the baseline bundle name
      __BASELINE_NAME__: JSON.stringify(baselineBundleSpec?.name || ''),

      // Inject the current bundle name
      __CURRENT_NAME__: JSON.stringify(currentBundleSpec.name),

      // Inject the remote bundles URL
      __REMOTE_BUNDLES_URL__: JSON.stringify(options?.remoteBundlesUrl || '')
    },

    plugins: [
      // When local development mode is active, enable the local bundles plugin that
      // allows the report app to access the local bundles directory
      ...(mode === 'watch' ? [localBundlesPlugin(bundlesDir, currentBundleSpec.path, options?.fetchRemoteBundle)] : [])
    ],

    build: {
      // Write output files to the configured directory (instead of the default `dist`);
      // note that this must be relative to the project `root`
      outDir,

      // Write js/css files to `public` (instead of the default `<outDir>/assets`)
      assetsDir: '',

      rolldownOptions: {
        // XXX: Suppress "Use of direct eval" warnings that are triggered by use
        // of the following pattern in threads.js, which appears in check bundles
        // built with an older version of plugin-check (such a bundle can still be
        // used as the baseline bundle for comparison purposes):
        //   eval("require")("worker_threads")
        // Bundles built with the current version of plugin-check don't use `eval`
        // at all, so this is only needed for backward compatibility.
        checks: {
          eval: false
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
