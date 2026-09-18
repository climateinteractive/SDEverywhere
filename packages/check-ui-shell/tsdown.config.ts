import { defineConfig } from 'tsdown'

export default defineConfig({
  tsconfig: 'tsconfig-build.json',
  entry: ['src/index.ts'],
  format: ['esm'],
  // Note that tsdown defaults `fixedExtension` to true for the `node` platform (which is
  // the default platform), and that would cause it to emit a `.d.mts` file instead of the
  // `.d.ts` file that we publish.  This package is `type: module`, so `.js` is already
  // unambiguously ESM; keeping the plain extensions leaves the published paths unchanged.
  fixedExtension: false,
  // Note that this package uses Vite to build the JavaScript bundle (because it needs to
  // process Svelte components and styles), so we only use `tsdown` to roll up the type
  // declarations into a single `index.d.ts` file
  dts: { emitDtsOnly: true },
  clean: false
})
