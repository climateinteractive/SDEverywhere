// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { copyFile, readdir, unlink, utimes } from 'node:fs/promises'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'

import { test, expect } from './support/fixtures'

const __dirname = dirname(fileURLToPath(import.meta.url))

test.describe('Bundle Selector', () => {
  test.beforeEach(async ({ app }) => {
    // Before each test, delete all files in the `bundles` directory except `previous.js`
    const projDir = joinPath(__dirname, '..')
    const bundlesDir = joinPath(projDir, 'bundles')
    const files = await readdir(bundlesDir)
    for (const file of files) {
      if (file !== 'previous.js') {
        await unlink(joinPath(bundlesDir, file))
      }
    }

    // Copy the current bundle file to the `bundles` directory so that we can test local bundles
    const prepDir = joinPath(projDir, 'sde-prep')
    const srcBundleFile = joinPath(prepDir, 'check-bundle.js')
    const dstBundleFile = joinPath(bundlesDir, 'local-1.js')
    await copyFile(srcBundleFile, dstBundleFile)

    // Set the last modified timestamp to a specific date/time
    const lastModified = new Date('2025-06-01T12:00:00.000Z')
    await utimes(dstBundleFile, lastModified, lastModified)

    // Open the report page
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

  test('should list available bundles', async ({ app }) => {
    // Click the left bundle name to open the popover
    await app.page.getByTestId('bundle-selector-left').click()

    // Wait for the bundle selector menu to appear
    const bundleList = app.page.getByRole('listbox')
    await expect(bundleList).toBeVisible()

    // Verify that the remote and local bundles are listed
    const expectedLabels = ['current', 'previous', 'feature/remote-2', 'local-1', 'feature/remote-1']
    const options = app.page.getByRole('option')
    await expect(options).toHaveCount(expectedLabels.length)
    const optionElems = await options.all()
    for (const [index, expectedLabel] of expectedLabels.entries()) {
      await expect(optionElems[index]).toHaveAttribute('aria-label', expectedLabel)
    }

    // Verify that the active bundle is highlighted
    const activeBundle = app.page.getByRole('option', { name: 'current' })
    await expect(activeBundle).toHaveClass(/active/)
  })

  test('should download a remote bundle', async ({ app }) => {
    // Click the left bundle name to open the popover
    await app.page.getByTestId('bundle-selector-left').click()

    // Wait for the bundle selector menu to appear
    const bundleList = app.page.getByRole('listbox')
    await expect(bundleList).toBeVisible()

    // Find and click on a remote bundle
    const remoteBundle = app.page.getByRole('option', { name: 'feature/remote-1' })
    await expect(remoteBundle).toBeVisible()

    // Right-click on the remote bundle to open context menu
    await remoteBundle.click({ button: 'right' })

    // Click the "Save to Local" option
    const saveToLocalOption = app.page.getByRole('menuitem', { name: /Save to Local/i })
    await expect(saveToLocalOption).toBeVisible()
    await saveToLocalOption.click()

    // Wait a moment for the download to complete
    await app.page.waitForTimeout(1000)

    // Verify that the remote and local bundles are listed
    const expectedLabels = [
      'current',
      'previous',
      'feature/remote-2',
      'local-1',
      'feature/remote-1',
      'feature/remote-1'
    ]
    const options = app.page.getByRole('option')
    await expect(options).toHaveCount(expectedLabels.length)
    const optionElems = await options.all()
    for (const [index, expectedLabel] of expectedLabels.entries()) {
      await expect(optionElems[index]).toHaveAttribute('aria-label', expectedLabel)
    }
  })

  test('should copy a local bundle with new name', async ({ app }) => {
    // Click the left bundle name to open the dropdown
    await app.page.getByTestId('bundle-selector-left').click()

    // Wait for the bundle selector menu to appear
    const bundleList = app.page.getByRole('listbox')
    await expect(bundleList).toBeVisible()

    // Find the current bundle
    const currentBundle = app.page.getByRole('option', { name: 'current' })
    await expect(currentBundle).toBeVisible()

    // Right-click on the current bundle to open context menu
    await currentBundle.click({ button: 'right' })

    // Click the "Save Copy..." option
    const saveCopyOption = app.page.getByRole('menuitem', { name: /Save Copy\.\.\./i })
    await expect(saveCopyOption).toBeVisible()
    await saveCopyOption.click()

    // Verify the dialog appears
    const dialog = app.page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Find the name input and verify it has a default value
    const nameInput = app.page.getByRole('textbox', { name: /Bundle name/i })
    await expect(nameInput).toHaveValue('current copy')

    // Change the name to something custom
    await nameInput.fill('my-test-bundle')

    // Click the Save button
    const saveButton = app.page.getByRole('button', { name: /Save/i })
    await saveButton.click()

    // Wait for the copy operation to complete
    await app.page.waitForTimeout(1000)

    // Verify that the remote and local bundles are listed
    const expectedLabels = ['current-copy', 'current', 'previous', 'remote-2', 'local-1', 'remote-1', 'remote-1']
    const options = app.page.getByRole('option')
    await expect(options).toHaveCount(expectedLabels.length)
    const optionElems = await options.all()
    for (const [index, expectedLabel] of expectedLabels.entries()) {
      await expect(optionElems[index]).toHaveAttribute('aria-label', expectedLabel)
    }
  })
})
