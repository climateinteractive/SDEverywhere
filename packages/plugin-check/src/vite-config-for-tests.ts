// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { dirname, relative, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function createViteConfigForTests(projDir: string, prepDir: string, mode: 'build' | 'watch'): InlineConfig {
  // Use `template-tests` as the root directory for the tests project
  const root = resolvePath(__dirname, '..', 'template-tests')

  // Include YAML files containing checks or comparison tests.  For checks, we look for either
  // `*.check.yaml` or `checks.yaml`.  For comparisons, we look for `comparisons.yaml`.  We
  // currently look at files under the configured project root directory.  This glob path
  // apparently must be a relative path (relative to the `template-tests/src` directory where
  // the glob is used).
  // TODO: Use globs/paths defined in options instead of guessing
  // and for comparisons,  files under the configured project root directory.
  const templateSrcDir = resolvePath(root, 'src')
  const relProjDir = relative(templateSrcDir, projDir)
  // XXX: The glob patterns must use forward slashes only, so on Windows we need to
  // convert backslashes to slashes
  const relProjDirPath = relProjDir.replaceAll('\\', '/')
  const checksYamlPath = `${relProjDirPath}/**/(*.check.yaml|checks.yaml)`
  const comparisonsYamlPath = `${relProjDirPath}/**/comparisons.yaml`

  // // Read the `package.json` for the template project
  // const pkgPath = resolvePath(root, 'package.json')
  // const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

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

    // Inject special values into the generated JS
    define: {
      // Inject the glob pattern for matching check yaml files
      __CHECKS_YAML_PATH__: JSON.stringify(checksYamlPath),
      // Inject the glob pattern for matching comparison yaml files
      __COMPARISONS_YAML_PATH__: JSON.stringify(comparisonsYamlPath)
    },

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
