import { defineConfig } from 'tsdown'

export default defineConfig({
  tsconfig: 'tsconfig-build.json',
  entry: ['src/index.ts'],
  external: [/^vite$/],
  fixedExtension: false,
  sourcemap: true,
  dts: { sourcemap: true }
})
