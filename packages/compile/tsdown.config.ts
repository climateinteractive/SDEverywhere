import { defineConfig } from 'tsdown'

export default defineConfig({
  tsconfig: 'tsconfig-build.json',
  // Note that this package publishes its JavaScript sources directly (they are not
  // bundled), so we only use `tsdown` to roll up the type declarations that are generated
  // from the JSDoc comments in those sources into a single `index.d.ts` file.
  //
  // XXX: tsdown cannot generate those declarations itself: when the entrypoint is a `.js`
  // file, it fails to resolve the relative `.js` imports that appear in the generated
  // declarations (it only follows such imports when they resolve to TypeScript sources).
  // As a workaround, the `build:dts` script runs `tsc` first to emit one declaration file
  // per source file under `dts-tmp`, and here we take those as input and roll them up.
  entry: ['dts-tmp/index.d.ts'],
  format: ['esm'],
  dts: { dtsInput: true },
  clean: true
})
