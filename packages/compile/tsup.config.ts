import { defineConfig } from 'tsup'

export default defineConfig({
  tsconfig: 'tsconfig-build.json',
  entry: ['src/index.js'],
  format: ['esm'],
  // Note that this package publishes its JavaScript sources directly (they are not
  // bundled), so we only use `tsup` to roll up the type declarations that are generated
  // from the JSDoc comments in those sources into a single `index.d.ts` file
  dts: { only: true },
  clean: true
})
