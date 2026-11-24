// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { dirname, relative, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig } from 'vite'

import { injectLiteralsPlugin } from './vite-inject-literals-plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function createViteConfigForTests(mode: 'bundle' | 'watch', projDir: string, prepDir: string): InlineConfig {
  // Use `template-tests` as the root directory for the tests project
  const root = resolvePath(__dirname, '..', 'template-tests')

  // Get the base glob path; apparently this must be a relative path (relative to
  // the `template-tests/src` directory where the glob is used)
  const templateSrcDir = resolvePath(root, 'src')
  const relProjDir = relative(templateSrcDir, projDir)
  // XXX: The glob pattern must use forward slashes only, so on Windows we need to
  // convert backslashes to slashes
  const relProjDirPath = relProjDir.replaceAll('\\', '/')

  // Include check test definitions in files matching `checks/*.yaml` under
  // the configured project root directory.  We also include `*.check.yaml`,
  // which was the naming used in earlier versions of the create package and
  // related examples.
  // TODO: Use yaml path/pattern from options
  const yamlCheckGlobPatterns = `['${relProjDirPath}/**/checks/*.yaml', '${relProjDirPath}/**/*.check.yaml']`

  // Include comparison test definitions in files matching `comparisons/*.yaml`
  // under the configured project root directory
  // TODO: Use yaml path/pattern from options
  const yamlComparisonGlobPatterns = `['${relProjDirPath}/**/comparisons/*.yaml']`

  // Calculate output directory relative to the template root
  // TODO: For now we write it to `prepDir`; make this configurable?
  const outDir = relative(root, prepDir)

  return {
    // Don't use an external config file
    configFile: false,

    // Use the root directory configured above
    root,

    // Don't clear the screen in dev mode so that we can see builder output
    clearScreen: false,

    // TODO: Disable vite output by default?
    // logLevel: 'silent',

    plugins: [
      // Inject special values into the generated JS.  Note that we use a literal
      // string replacement plugin instead of Vite's built-in `define` feature
      // because the latter does not run before the glob handler (which requires
      // the glob to be injected as a literal).
      injectLiteralsPlugin({
        // Inject the glob patterns for matching model check yaml files
        '"./__YAML_CHECK_GLOB_PATTERNS__"': yamlCheckGlobPatterns,
        // Inject the glob patterns for matching model comparison yaml files
        '"./__YAML_COMPARISON_GLOB_PATTERNS__"': yamlComparisonGlobPatterns
      })
    ],

    build: {
      // Write output files to the configured directory (instead of the default `dist`);
      // note that this must be relative to the project `root`
      outDir,
      emptyOutDir: false,

      lib: {
        entry: './src/index.ts',
        formats: ['es'],
        fileName: () => 'check-tests.js'
      },

      // Enable watch mode if requested
      watch: mode === 'watch' && {}

      // TODO: For now we include check-core in the packaged library so that its
      // dependencies are correctly resolved at runtime.  Ideally this would only
      // include a couple functions that are used for defining tests; we could
      // consider externalizing dependencies here, for example:
      //   rolldownOptions: {
      //     external: Object.keys(pkg.dependencies)
      //   }
    }
  }
}
