import { defineConfig } from 'tsup'

export default defineConfig({
  tsconfig: 'tsconfig-build.json',
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  external: [/^vite$/],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  // Enable shims so that `import.meta.url` is translated to `__dirname` in CJS bundle
  shims: true
})
