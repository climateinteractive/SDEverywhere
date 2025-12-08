// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { test as base, expect, type Page, type Locator } from '@playwright/test'

/**
 * Extended test fixtures with custom helper methods.
 */
export const test = base.extend<{
  app: AppHelpers
}>({
  app: async ({ page }, use) => {
    const helpers = new AppHelpers(page)
    await use(helpers)
  }
})

export { expect }

/**
 * Helper class with commonly used methods for e2e tests.
 */
export class AppHelpers {
  constructor(public readonly page: Page) {}

  /**
   * Visit the report app.
   */
  async visitReport(): Promise<void> {
    await this.page.goto(`/index.html`)
  }
}
