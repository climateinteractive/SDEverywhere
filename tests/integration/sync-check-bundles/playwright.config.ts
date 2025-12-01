// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for e2e tests.
 *
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:9001',
    // Collect trace when retrying the failed test
    trace: 'on-first-retry'
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // Start dev server before running tests (only when PLAYWRIGHT_WITH_DEV_SERVER is set)
  webServer: process.env.PLAYWRIGHT_WITH_DEV_SERVER
    ? [
        {
          command: 'pnpm serve-test-bundles',
          name: 'Remote Bundles Server',
          url: 'http://localhost:9000',
          reuseExistingServer: !process.env.CI,
          timeout: 120000
        },
        {
          command: 'pnpm dev',
          name: 'Web App',
          url: 'http://localhost:9001',
          reuseExistingServer: !process.env.CI,
          timeout: 120000
        }
      ]
    : undefined
})
