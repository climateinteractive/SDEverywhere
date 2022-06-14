import { dirname, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import { defineConfig } from 'vite'

// Note that Vite tries to inject `__dirname` but if we leave it undefined then
// Node will complain ("ERROR: __dirname is not defined in ES module scope") so
// we use our own special name here
const bundleDir = dirname(fileURLToPath(import.meta.url))

// For demonstration purposes, we support generating two different versions
// of the bundle (v1 and v2).  The version number is injected into the bundle
// and the bundle can conditionally advertise a different set of variables
// to demonstrate how added, removed, and renamed variables are handled
// by the model-check tools.
const modelVersion = process.env.MODEL_VERSION
if (modelVersion !== '1' && modelVersion !== '2') {
  console.error(`ERROR: Must set MODEL_VERSION to '1' or '2'`)
  process.exit(1)
}

function localPackage(...subpath) {
  return resolvePath(bundleDir, '..', ...subpath)
}

// TODO: Get the actual size of the model file(s)
const modelSizeInBytes = 100000

// TODO: Get the actual size of the data file(s)
const dataSizeInBytes = 50000

export default defineConfig({
  // Only build the library in production mode (dev mode is not applicable)
  mode: 'production',

  // Don't clear the screen in dev mode so that we can see builder output
  clearScreen: false,

  // Inject special values into the generated JS
  define: {
    // Inject the model size
    __MODEL_SIZE_IN_BYTES__: modelSizeInBytes,
    // Inject the data size
    __DATA_SIZE_IN_BYTES__: dataSizeInBytes,
    // Inject the special model version
    __MODEL_VERSION__: modelVersion
  },

  resolve: {
    alias: {
      // Configure path aliases; these should match the corresponding lines in `tsconfig-base.json`
      '@sdeverywhere/check-core': localPackage('check-core/src')
    }
  },

  build: {
    // Write output file to `dist/sample-check-bundle-v{1,2}.js`
    outDir: 'dist',
    emptyOutDir: false,

    // TODO: Uncomment for debugging purposes
    // minify: false,

    lib: {
      entry: './src/index.ts',
      formats: ['es'],
      fileName: () => `sample-check-bundle-v${modelVersion}.js`
    }
  }
})
