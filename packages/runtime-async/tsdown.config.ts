import { defineConfig } from 'tsdown'

export default defineConfig({
  tsconfig: 'tsconfig-build.json',
  // Note that we generate separate runner and worker entrypoints; the
  // worker one in particular is used by plugin-worker to avoid having
  // Vite pull in extra code that breaks the worker
  entry: ['src/index.ts', 'src/runner.ts', 'src/worker.ts'],
  format: ['esm', 'cjs'],
  // Note that tsdown defaults `fixedExtension` to true for the `node` platform (which is
  // the default platform), and that would cause it to emit `.mjs`/`.d.mts` files instead
  // of the `.js`/`.d.ts` files that we publish.  This package is `type: module`, so `.js`
  // is already unambiguously ESM; keeping the plain extensions leaves the published paths
  // unchanged.
  fixedExtension: false,
  // Note that the declaration file source maps must be enabled explicitly; the top-level
  // `sourcemap` option below causes tsdown to add a `sourceMappingURL` comment to the
  // declaration files, but the map files themselves are only emitted when this is set
  dts: { sourcemap: true },
  sourcemap: true,
  clean: true
})
