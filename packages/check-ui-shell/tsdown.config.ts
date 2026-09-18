import { defineConfig } from 'tsdown'

export default defineConfig({
  tsconfig: 'tsconfig-build.json',
  entry: ['src/index.ts'],
  fixedExtension: false,
  // Note that this package uses Vite to build the JavaScript bundle (because it needs to
  // process Svelte components and styles), so we only use `tsdown` to roll up the type
  // declarations into a single `index.d.ts` file
  dts: { emitDtsOnly: true },
  // Note that `tsdown` runs after Vite in the `build` script, so cleaning must be
  // disabled here (the default is enabled); otherwise it would delete the bundle and
  // stylesheet that Vite has already written to `dist`
  clean: false
})
