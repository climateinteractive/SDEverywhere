import { defineConfig } from 'vitest/config'

// This is the Vitest configuration for the tests that cover the helper scripts in the
// `scripts` directory (see the `test:scripts` script in `package.json`)
export default defineConfig({
  test: {
    // Only include the tests for the helper scripts here; the tests for each package
    // are run by that package
    include: ['scripts/**/*.spec.ts']
  }
})
