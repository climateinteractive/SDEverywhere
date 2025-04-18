// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { dirname, relative, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig, PluginOption } from 'vite'
import replace from '@rollup/plugin-replace'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function createViteConfigForTests(projDir: string, prepDir: string, mode: 'build' | 'watch'): InlineConfig {
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
      // Inject special values into the generated JS
      // TODO: We currently have to use `@rollup/plugin-replace` instead of Vite's
      // built-in `define` feature because the latter does not seem to run before
      // the glob handler (which requires the glob to be injected as a literal)
      replace({
        preventAssignment: true,
        delimiters: ['', ''],
        values: {
          // Inject the glob patterns for matching model check yaml files
          '"./__YAML_CHECK_GLOB_PATTERNS__"': yamlCheckGlobPatterns,
          // Inject the glob patterns for matching model comparison yaml files
          '"./__YAML_COMPARISON_GLOB_PATTERNS__"': yamlComparisonGlobPatterns
        }
      }) as unknown as PluginOption
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
      watch: mode === 'watch' && {},

      rollupOptions: {
        // Prevent dependencies from being included in packaged library
        // TODO: For now we include check-core in the packaged library so that its
        // dependencies are correctly resolved at runtime.  Ideally this would only
        // include a couple functions that are used for defining tests, but Vite 2.x
        // does not implement tree shaking for ES libraries, which means the generated
        // library is much larger than it needs to be.  Once we upgrade to Vite 3.x,
        // the generated library should be smaller; see related fix:
        //   https://github.com/vitejs/vite/pull/8737
        // external: Object.keys(pkg.dependencies)
      }
    }
  }
}
