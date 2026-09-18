import { defineConfig } from 'tsdown'

export default defineConfig({
  tsconfig: 'tsconfig-build.json',
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  external: [/^vite$/],
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
