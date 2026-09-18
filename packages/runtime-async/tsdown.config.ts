import { defineConfig } from 'tsdown'

export default defineConfig({
  tsconfig: 'tsconfig-build.json',
  // Note that we generate separate runner and worker entrypoints; the
  // worker one in particular is used by plugin-worker to avoid having
  // Vite pull in extra code that breaks the worker
  entry: ['src/index.ts', 'src/runner.ts', 'src/worker.ts'],
  fixedExtension: false,
  sourcemap: true,
  dts: { sourcemap: true }
})
