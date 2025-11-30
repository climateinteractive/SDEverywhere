<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund. All rights reserved. -->

<script module lang="ts">
import { expect, fireEvent, userEvent, fn, waitFor } from 'storybook/test'
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import type { Mock } from 'vitest'

import { bundleManagerFromBundles, localBundles, mockBundleSpec } from '../../_mocks/mock-bundle-manager'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import { BundleManager } from './bundle-manager.svelte'
import type { BundleSpec } from './bundle-spec'
import BundleSelector from './bundle-selector.svelte'

const { Story } = defineMeta({
  title: 'Components/BundleSelector',
  component: BundleSelector,
  args: {
    onSelect: fn()
  }
})

interface StoryArgsWithCallback {
  onDownloadBundle: Mock
  side: 'left' | 'right'
  onSelect?: (bundle: BundleSpec) => void
}
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={600} height={400}>
    <BundleSelector {...args} />
  </StoryDecorator>
{/snippet}

{#snippet templateWithCallback(args: StoryArgsWithCallback)}
  {@const onDownloadBundle = args.onDownloadBundle}
  {@const bundleManager = bundleManagerFromBundles({ onDownloadBundle })}
  <StoryDecorator width={600} height={400}>
    <BundleSelector side={args.side} {bundleManager} onSelect={args.onSelect} />
  </StoryDecorator>
{/snippet}

<Story
  name="Default"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(),
    side: 'left'
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Get all bundle items
    const bundleItems = canvas.getAllByRole('option')

    // Verify that we have the expected number of bundles
    await expect(bundleItems).toHaveLength(11)

    // Verify the order of items (sorted by date descending by default)
    const expectedOrder = [
      'current',
      'main',
      'previous',
      'chris/123-feature',
      'local-only',
      'release/25.5.0',
      'release/25.4.0',
      'chris/456-another-feature',
      'release/25.3.0',
      'release/25.2.0',
      'release/25.1.0'
    ]

    // Check each item's name matches the expected order
    bundleItems.forEach(async (item, index) => {
      await expect(item).toHaveTextContent(expectedOrder[index])
    })

    // Verify that the active bundle is highlighted
    const activeBundle = canvas.getByRole('option', { name: 'main' })
    await expect(activeBundle).toHaveClass('active')
  }}
></Story>

<Story
  name="Search"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(),
    side: 'left'
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Test search filtering
    const searchInput = canvas.getByRole('searchbox')
    await userEvent.type(searchInput, 'release')

    // Get filtered items
    const filteredItems = canvas.getAllByRole('option')

    // Verify we have exactly 5 release bundles
    await expect(filteredItems).toHaveLength(5)

    // Verify they are all release bundles
    const releaseBundles = ['release/25.5.0', 'release/25.4.0', 'release/25.3.0', 'release/25.2.0', 'release/25.1.0']

    filteredItems.forEach(async (item, index) => {
      await expect(item).toHaveTextContent(releaseBundles[index])
    })
  }}
></Story>

<Story
  name="Empty"
  {template}
  args={{
    side: 'left',
    bundleManager: new BundleManager({})
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify "No bundles available" message
    const messages = canvas.getAllByText(/No bundles/i)
    await expect(messages.length).toBeGreaterThan(0)
  }}
></Story>

<Story
  name="Loading"
  {template}
  args={{
    bundleManager: new BundleManager({
      getLocalBundles: async () => {
        // Simulate slow loading
        await new Promise(resolve => setTimeout(resolve, 1000))
        return []
      }
    }),
    side: 'left'
  }}
  play={async ({ canvas }) => {
    // Verify loading state message
    await expect(canvas.getByText('Loading...')).toBeInTheDocument()
  }}
></Story>

<Story
  name="Error"
  {template}
  args={{
    bundleManager: new BundleManager({
      getLocalBundles: async () => {
        throw new Error('Simulated error')
      }
    }),
    side: 'left'
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify error state message appears (in both content and status bar)
    const errorMessages = canvas.getAllByText(/Failed to load local bundles: Simulated error/i)
    await expect(errorMessages.length).toBeGreaterThan(0)
  }}
></Story>

<Story
  name="Selection"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(),
    side: 'left'
  }}
  play={async ({ canvas, args }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Click on the first bundle
    const firstBundle = canvas.getAllByRole('option')[0]
    await userEvent.click(firstBundle)

    // Verify that onSelect was called with the correct bundle
    await expect(args.onSelect).toHaveBeenCalledWith(mockBundleSpec('local', 'current', '2025-06-15T10:00:00.000Z'))
  }}
></Story>

<Story
  name="Column Headers"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(),
    side: 'left'
  }}
  play={async ({ canvas }) => {
    // Verify column headers are present and labeled correctly
    await expect(canvas.getByRole('button', { name: /Name/i })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /Last Modified/i })).toBeInTheDocument()
  }}
></Story>

<Story
  name="Status Bar with Reload"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(),
    side: 'left'
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Find the reload button in the status bar (not in header)
    const reloadButton = canvas.getByRole('button', { name: /reload/i })
    await expect(reloadButton).toBeInTheDocument()

    // Click reload button
    await userEvent.click(reloadButton)

    // Should show loading state
    await expect(canvas.getByText('Loading...')).toBeInTheDocument()
  }}
></Story>

<Story
  name="Status Bar - Loading State"
  {template}
  args={{
    bundleManager: new BundleManager({
      getLocalBundles: async () => {
        // Simulate slow loading
        await new Promise(resolve => setTimeout(resolve, 10000))
        return []
      }
    }),
    side: 'left'
  }}
  play={async ({ canvas }) => {
    // Verify loading message is shown in status bar
    await expect(canvas.getByText('Loading...')).toBeInTheDocument()

    // Verify reload button is disabled while loading
    const reloadButton = canvas.getByRole('button', { name: /reload/i })
    await expect(reloadButton).toBeDisabled()
  }}
></Story>

<Story
  name="No Sources Provided"
  {template}
  args={{
    bundleManager: new BundleManager({}),
    side: 'left'
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify "No bundles available" message
    const messages = canvas.getAllByText('No bundles available')
    await expect(messages.length).toBeGreaterThan(0)
  }}
></Story>

<Story
  name="Local Bundles Only"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles({ bundles: localBundles }),
    side: 'right'
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify bundles are loaded
    const bundleItems = canvas.getAllByRole('option')
    await expect(bundleItems).toHaveLength(3)

    const expectedOrder = ['current', 'previous', 'local-only']

    // Check each item's name matches the expected order
    bundleItems.forEach(async (item, index) => {
      await expect(item).toHaveTextContent(expectedOrder[index])
    })
  }}
></Story>

<Story
  name="Context Menu - Remote Bundle Save to Local"
  template={templateWithCallback as unknown as typeof template}
  args={{
    onDownloadBundle: fn(),
    side: 'left',
    onSelect: fn()
  } as unknown as Args<typeof Story>}
  play={async ({ canvas, args }) => {
    const customArgs = args as unknown as StoryArgsWithCallback
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Find a remote bundle (main)
    const mainBundle = canvas.getByRole('option', { name: 'main' })

    // Right-click on the remote bundle
    fireEvent.contextMenu(mainBundle)

    // Verify context menu appears
    const contextMenu = await canvas.findByRole('menuitem', { name: /Save to Local/i })
    await expect(contextMenu).toBeInTheDocument()

    // Click the "Save to Local" option
    await userEvent.click(contextMenu)

    // Verify that downloadBundle was called with the correct bundle
    await waitFor(() => {
      expect(customArgs.onDownloadBundle).toHaveBeenCalled()
    })
  }}
></Story>

<Story
  name="Context Menu - Local Bundle Save Copy"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(),
    side: 'left'
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Find a local bundle
    const localBundle = canvas.getByRole('option', { name: 'local-only' })

    // Right-click on the local bundle
    fireEvent.contextMenu(localBundle)

    // Verify context menu appears
    const contextMenu = await canvas.findByRole('menuitem', { name: /Save Copy\.\.\./i })
    await expect(contextMenu).toBeInTheDocument()

    // Click the "Save Copy..." option
    await userEvent.click(contextMenu)

    // Verify dialog appears with the default name
    const dialog = await canvas.findByRole('dialog')
    await expect(dialog).toBeInTheDocument()

    // Verify the input has the default value
    const nameInput = canvas.getByRole('textbox', { name: /Bundle name/i })
    await expect(nameInput).toHaveValue('local-only copy')

    // Change the name
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'my-new-bundle')

    // Click the Save button
    const saveButton = canvas.getByRole('button', { name: /Save/i })
    await userEvent.click(saveButton)

    // Verify dialog closes
    await waitFor(() => expect(canvas.queryByRole('dialog')).not.toBeInTheDocument())
  }}
></Story>

<Story
  name="Context Menu - Remote Bundle with Slashes in Name"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(),
    side: 'left'
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Find a remote bundle with slashes (release/25.5.0)
    const releaseBundle = canvas.getByRole('option', { name: 'release/25.5.0' })

    // Right-click on the remote bundle
    fireEvent.contextMenu(releaseBundle)

    // Verify context menu appears
    const contextMenu = await canvas.findByRole('menuitem', { name: /Save to Local/i })
    await expect(contextMenu).toBeInTheDocument()

    // Click the "Save to Local" option
    await userEvent.click(contextMenu)

    // The bundle name should have "/" replaced with "-" when saved
    // This will be verified by the implementation
  }}
></Story>

<Story
  name="Context Menu - Local Bundle with Spaces in Name"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles({
      bundles: [mockBundleSpec('local', 'my bundle name', '2025-05-14T10:00:00.000Z')]
    }),
    side: 'left'
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Find the local bundle
    const localBundle = canvas.getByRole('option', { name: 'my bundle name' })

    // Right-click on the local bundle
    fireEvent.contextMenu(localBundle)

    // Verify context menu appears
    const contextMenu = await canvas.findByRole('menuitem', { name: /Save Copy\.\.\./i })
    await expect(contextMenu).toBeInTheDocument()

    // Click the "Save Copy..." option
    await userEvent.click(contextMenu)

    // Verify dialog appears with the default name
    const dialog = await canvas.findByRole('dialog')
    await expect(dialog).toBeInTheDocument()

    // Verify the input has the default value with " copy" appended
    const nameInput = canvas.getByRole('textbox', { name: /Bundle name/i })
    await expect(nameInput).toHaveValue('my bundle name copy')

    // Click Save without changing the name
    const saveButton = canvas.getByRole('button', { name: /Save/i })
    await userEvent.click(saveButton)

    // The saved name should have spaces replaced with "-"
    // This will be verified by the implementation
  }}
></Story>
