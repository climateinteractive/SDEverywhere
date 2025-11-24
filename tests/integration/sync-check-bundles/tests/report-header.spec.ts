// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { test, expect } from './support/fixtures'

test.describe('Report Header', () => {
  test.beforeEach(async ({ app }) => {
    await app.visitReport()
  })

  test('should show the initial bundle names', async ({ app }) => {
    const bundleSelectorLeft = app.page.getByTestId('bundle-selector-left')
    const bundleSelectorRight = app.page.getByTestId('bundle-selector-right')

    await expect(bundleSelectorLeft).toBeVisible()
    await expect(bundleSelectorLeft).toHaveText('current')

    await expect(bundleSelectorRight).toBeVisible()
    await expect(bundleSelectorRight).toHaveText('current')
  })
})
