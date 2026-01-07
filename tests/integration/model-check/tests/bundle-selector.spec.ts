// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { copyFile, mkdir, readdir, rm, utimes } from 'node:fs/promises'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'

import { test, expect } from './support/fixtures'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projDir = joinPath(__dirname, '..')
const bundlesDir = joinPath(projDir, 'bundles')

test.describe('Bundle Selector', () => {
  // XXX: Run tests in serial mode since each test modifies the `bundles` directory
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    // Reset the last modified timestamp of the current bundle to the current time
    const currentBundleFile = joinPath(projDir, 'sde-prep', 'check-bundle.js')
    const currentTime = new Date()
    await utimes(currentBundleFile, currentTime, currentTime)
  })

  test.beforeEach(async ({ app }) => {
    // Before each test, delete all files and directories in the `bundles` directory except `previous.js`
    const files = await readdir(bundlesDir)
    for (const file of files) {
      if (file !== 'previous.js') {
        await rm(joinPath(bundlesDir, file), { recursive: true, force: true })
      }
    }

    // Copy the current bundle file to the `bundles` directory so that we can test local bundles
    const prepDir = joinPath(projDir, 'sde-prep')
    const srcBundleFile = joinPath(prepDir, 'check-bundle.js')
    const dstBundleFile = joinPath(bundlesDir, 'local-1.js')
    await copyFile(srcBundleFile, dstBundleFile)

    // // Also copy to a nested directory so that we can test local bundles with slashes in name
    // const nestedBundlesDir = joinPath(bundlesDir, 'nested')
    // await mkdir(nestedBundlesDir, { recursive: true })
    // const dstNestedBundleFile = joinPath(nestedBundlesDir, 'local-2.js')
    // await copyFile(srcBundleFile, dstNestedBundleFile)

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

  test('should download a remote bundle and load the local copy', async ({ app }) => {
    // Click the left bundle name to open the popover
    await app.page.getByTestId('bundle-selector-left').click()

    // Wait for the bundle selector menu to appear
    const bundleList = app.page.getByRole('listbox')
    await expect(bundleList).toBeVisible()

    // Find the remote bundle (there should be exactly one remote bundle with this name)
    const remoteBundles = app.page.getByRole('option', { name: 'feature/remote-1' })
    await expect(remoteBundles).toHaveCount(1)

    // Right-click on the remote bundle to open context menu
    await remoteBundles.first().click({ button: 'right' })

    // Click the "Save to Local" option
    const saveToLocalOption = app.page.getByRole('menuitem', { name: /Save to Local/i })
    await expect(saveToLocalOption).toBeVisible()
    await saveToLocalOption.click()

    // Wait for the download to complete and the bundle list to refresh
    await app.page.waitForTimeout(1000)

    // Verify that there is now a local version of "feature/remote-1" in the bundle list
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

    // Now find the local version of "feature/remote-1" in the bundle list (there will be
    // two bundles: one remote, one local)
    const localBundles = app.page.getByRole('option', { name: 'feature/remote-1' })
    await expect(localBundles).toHaveCount(2)

    // Click on the second one (the local bundle)
    await localBundles.nth(1).click()

    // Wait for the page to reload
    await app.page.waitForLoadState('load')

    // Verify that the left bundle selector now shows the selected bundle
    const bundleSelectorLeft = app.page.getByTestId('bundle-selector-left')
    await expect(bundleSelectorLeft).toBeVisible()
    await expect(bundleSelectorLeft).toHaveText('feature/remote-1')
  })

  test('should copy a local bundle with new name and load the new copy', async ({ app }) => {
    // Click the left bundle name to open the dropdown
    await app.page.getByTestId('bundle-selector-left').click()

    // Wait for the bundle selector menu to appear
    const bundleList = app.page.getByRole('listbox')
    await expect(bundleList).toBeVisible()

    // Find the "local-1" bundle
    const localBundle = app.page.getByRole('option', { name: 'local-1' })
    await expect(localBundle).toBeVisible()

    // Right-click on the "local-1" bundle to open context menu
    await localBundle.click({ button: 'right' })

    // Click the "Save Copy..." option
    const saveCopyOption = app.page.getByRole('menuitem', { name: /Save Copy\.\.\./i })
    await expect(saveCopyOption).toBeVisible()
    await saveCopyOption.click()

    // Verify that the dialog appears
    const dialog = app.page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Find the name input and verify it has a default value
    const nameInput = app.page.getByRole('textbox', { name: /Bundle name/i })
    await expect(nameInput).toHaveValue('local-1 copy')

    // Change the name to something custom
    await nameInput.fill('my-test-bundle')

    // Click the Save button
    const saveButton = app.page.getByRole('button', { name: /Save/i })
    await saveButton.click()

    // Wait for the copy operation to complete
    await app.page.waitForTimeout(1000)

    // Verify that the copied bundle now appears in the list
    const expectedLabels = ['current', 'previous', 'feature/remote-2', 'local-1', 'my-test-bundle', 'feature/remote-1']
    const options = app.page.getByRole('option')
    await expect(options).toHaveCount(expectedLabels.length)
    const optionElems = await options.all()
    for (const [index, expectedLabel] of expectedLabels.entries()) {
      await expect(optionElems[index]).toHaveAttribute('aria-label', expectedLabel)
    }

    // Find the copied bundle in the list
    const copiedBundle = app.page.getByRole('option', { name: 'my-test-bundle' })

    // Click on the copied bundle
    await copiedBundle.click()

    // Wait for the page to reload
    await app.page.waitForLoadState('load')

    // Verify that the left bundle selector now shows the selected bundle
    const bundleSelectorLeft = app.page.getByTestId('bundle-selector-left')
    await expect(bundleSelectorLeft).toBeVisible()
    await expect(bundleSelectorLeft).toHaveText('my-test-bundle')
  })

  test('should copy the current bundle with new name and load the new copy', async ({ app }) => {
    // Click the left bundle name to open the dropdown
    await app.page.getByTestId('bundle-selector-left').click()

    // Wait for the bundle selector menu to appear
    const bundleList = app.page.getByRole('listbox')
    await expect(bundleList).toBeVisible()

    // Find the "current" bundle
    const localBundle = app.page.getByRole('option', { name: 'current' })
    await expect(localBundle).toBeVisible()

    // Right-click on the "local-1" bundle to open context menu
    await localBundle.click({ button: 'right' })

    // Click the "Save Copy..." option
    const saveCopyOption = app.page.getByRole('menuitem', { name: /Save Copy\.\.\./i })
    await expect(saveCopyOption).toBeVisible()
    await saveCopyOption.click()

    // Verify that the dialog appears
    const dialog = app.page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Find the name input and verify it has a default value
    const nameInput = app.page.getByRole('textbox', { name: /Bundle name/i })
    await expect(nameInput).toHaveValue('current copy')

    // Change the name to something custom
    await nameInput.fill('my-current-copy')

    // Click the Save button
    const saveButton = app.page.getByRole('button', { name: /Save/i })
    await saveButton.click()

    // Wait for the copy operation to complete
    await app.page.waitForTimeout(1000)

    // Verify that the copied bundle now appears in the list
    const expectedLabels = ['my-current-copy', 'current', 'previous', 'feature/remote-2', 'local-1', 'feature/remote-1']
    const options = app.page.getByRole('option')
    await expect(options).toHaveCount(expectedLabels.length)
    const optionElems = await options.all()
    for (const [index, expectedLabel] of expectedLabels.entries()) {
      await expect(optionElems[index]).toHaveAttribute('aria-label', expectedLabel)
    }

    // Find the copied bundle in the list
    const copiedBundle = app.page.getByRole('option', { name: 'my-current-copy' })

    // Click on the copied bundle
    await copiedBundle.click()

    // Wait for the page to reload
    await app.page.waitForLoadState('load')

    // Verify that the left bundle selector now shows the selected bundle
    const bundleSelectorLeft = app.page.getByTestId('bundle-selector-left')
    await expect(bundleSelectorLeft).toBeVisible()
    await expect(bundleSelectorLeft).toHaveText('my-current-copy')
  })

  test('should reload page and use the correct bundle when a local bundle is selected with slashes in name', async ({
    app
  }) => {
    // Click the left bundle name to open the popover
    await app.page.getByTestId('bundle-selector-left').click()

    // Wait for the bundle selector menu to appear
    const bundleList = app.page.getByRole('listbox')
    await expect(bundleList).toBeVisible()

    // Find the remote bundle "feature/remote-1" (which has a slash in the name)
    const remoteBundles = app.page.getByRole('option', { name: 'feature/remote-1' })
    await expect(remoteBundles).toHaveCount(1)

    // Right-click on the remote bundle to open context menu
    await remoteBundles.first().click({ button: 'right' })

    // Click the "Save to Local" option
    const saveToLocalOption = app.page.getByRole('menuitem', { name: /Save to Local/i })
    await expect(saveToLocalOption).toBeVisible()
    await saveToLocalOption.click()

    // Wait for the download to complete and the bundle list to refresh
    await app.page.waitForTimeout(1000)

    // Now find the local version of "feature/remote-1" in the bundle list
    const localBundles = app.page.getByRole('option', { name: 'feature/remote-1' })
    // Should have 2: one remote, one local
    await expect(localBundles).toHaveCount(2)

    // Click on the second one (the local bundle)
    await localBundles.nth(1).click()

    // Wait for the page to reload
    await app.page.waitForLoadState('load')

    // Verify that the left bundle selector now shows the selected bundle
    const bundleSelectorLeft = app.page.getByTestId('bundle-selector-left')
    await expect(bundleSelectorLeft).toBeVisible()
    await expect(bundleSelectorLeft).toHaveText('feature/remote-1')
  })

  test('should reload page and use the correct bundle when a remote bundle is selected', async ({ app }) => {
    // Verify the initial "left" bundle name
    const bundleSelectorLeft = app.page.getByTestId('bundle-selector-left')
    await expect(bundleSelectorLeft).toBeVisible()
    await expect(bundleSelectorLeft).toHaveText('current')

    // Verify the initial "right" bundle name
    const bundleSelectorRight = app.page.getByTestId('bundle-selector-right')
    await expect(bundleSelectorRight).toBeVisible()
    await expect(bundleSelectorRight).toHaveText('current')

    // Click the left bundle name to open the popover
    await app.page.getByTestId('bundle-selector-left').click()

    // Wait for the bundle selector menu to appear
    const bundleList = app.page.getByRole('listbox')
    await expect(bundleList).toBeVisible()

    // Find and click on a remote bundle
    const remoteBundle = app.page.getByRole('option', { name: 'feature/remote-1' })
    await expect(remoteBundle).toBeVisible()

    // Click on the remote bundle to select it
    await remoteBundle.click()

    // Wait for the page to reload
    await app.page.waitForLoadState('load')

    // Verify that the left bundle selector now shows the selected bundle
    await expect(bundleSelectorLeft).toBeVisible()
    await expect(bundleSelectorLeft).toHaveText('feature/remote-1')

    // Verify that the right bundle selector still shows 'current'
    await expect(bundleSelectorRight).toBeVisible()
    await expect(bundleSelectorRight).toHaveText('current')
  })

  test('should display updated current bundle timestamp after file modification', async ({ app }) => {
    // Update the last modified time of the current bundle file to a specific date/time
    const projDir = joinPath(__dirname, '..')
    const prepDir = joinPath(projDir, 'sde-prep')
    const currentBundleFile = joinPath(prepDir, 'check-bundle.js')
    const newLastModified = new Date('2025-12-15T08:30:00.000Z')
    await utimes(currentBundleFile, newLastModified, newLastModified)

    // XXX: Wait for the page to reload since the bundle file was updated
    await app.page.waitForTimeout(1000)

    // Open the bundle selector
    await app.page.getByTestId('bundle-selector-left').click()

    // Wait for the bundle selector menu to appear
    const bundleList = app.page.getByRole('listbox')
    await expect(bundleList).toBeVisible()

    // Click the reload button to refresh the bundle list with the updated file timestamp
    const reloadButton = app.page.getByRole('button', { name: 'Reload' })
    await expect(reloadButton).toBeVisible()
    await reloadButton.click()

    // Wait for the bundle list to reload
    await app.page.waitForTimeout(1000)

    // Verify that the current bundle now shows the updated timestamp
    const currentBundle = app.page.getByRole('option', { name: 'current' })
    await expect(currentBundle).toBeVisible()

    // Get the date cell for the current bundle and verify it matches our expected timestamp
    const dateCell = currentBundle.locator('.bundle-selector-item-bundle-date')
    await expect(dateCell).toBeVisible()

    // Format the expected date using the same locale-aware formatting that the UI uses
    const expectedDate = new Date('2025-12-15T08:30:00.000Z')
    const expectedDateString = expectedDate.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    })
    const expectedTimeString = expectedDate.toLocaleTimeString(undefined, {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    })
    const expectedFormattedDate = `${expectedDateString} at ${expectedTimeString}`

    // Verify that the displayed date matches our expected formatted date
    const dateText = await dateCell.textContent()
    expect(dateText).toBe(expectedFormattedDate)
  })
})
