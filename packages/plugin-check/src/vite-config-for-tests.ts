// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { dirname, relative, resolve as resolvePath } from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

import type { InlineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function createViteConfigForTests(prepDir: string): InlineConfig {
  // Use `template-tests` as the root directory for the tests project
  const root = resolvePath(__dirname, '..', 'template-tests')

  // Read the `package.json` for the template project
  const pkgPath = resolvePath(root, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

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

      rollupOptions: {
        // Prevent dependencies from being included in packaged library
        external: Object.keys(pkg.dependencies)
      }
    }
  }
}
