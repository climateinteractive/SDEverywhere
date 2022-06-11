import { defineConfig } from 'tsup'

export default defineConfig({
  tsconfig: 'tsconfig-build.json',
  // Note that we generate separate runner and worker entrypoints; the
  // worker one in particular is used by plugin-worker to avoid having
  // Vite pull in extra code that breaks the worker
  entry: ['src/index.ts', 'src/runner.ts', 'src/worker.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true
})
