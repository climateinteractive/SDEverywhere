import { defineConfig } from 'tsdown'

export default defineConfig({
  tsconfig: 'tsconfig-build.json',
  entry: ['src/index.ts'],
  fixedExtension: false,
  // Note that this package uses Vite to build the JavaScript bundle (because it needs to
  // process Svelte components and styles), so we only use `tsdown` to roll up the type
  // declarations into a single `index.d.ts` file
  dts: { emitDtsOnly: true },
  clean: false
})
