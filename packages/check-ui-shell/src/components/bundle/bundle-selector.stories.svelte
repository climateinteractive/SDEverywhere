<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund. All rights reserved. -->

<script module lang="ts">
import { expect, userEvent, fn, waitFor } from 'storybook/test'
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'

import { bundleManagerFromBundles, localBundles, mockBundleSpec, remoteBundles } from '../../_mocks/mock-bundle-manager'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import { BundleManager } from './bundle-manager.svelte'
import BundleSelector from './bundle-selector.svelte'

const { Story } = defineMeta({
  title: 'Components/BundleSelector',
  component: BundleSelector,
  args: {
    onSelect: fn()
  }
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={600} height={400}>
    <BundleSelector {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Default"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(remoteBundles)
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Get all bundle items
    const bundleItems = canvas.getAllByRole('option')

    // Verify that we have the expected number of bundles
    await expect(bundleItems).toHaveLength(8)

    // Verify the order of items (sorted by date descending by default)
    const expectedOrder = [
      'main',
      'chris/123-feature',
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
  }}
></Story>

<Story
  name="Search"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(remoteBundles)
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
        await new Promise(resolve => setTimeout(resolve, 10000))
        return []
      }
    })
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
        throw new Error('Failed to load bundles')
      }
    })
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify error state message appears (in both content and status bar)
    const errorMessages = canvas.getAllByText(/Failed to load bundles/i)
    await expect(errorMessages.length).toBeGreaterThan(0)
  }}
></Story>

<Story
  name="Selection"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(remoteBundles)
  }}
  play={async ({ canvas, args }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Click on the first bundle
    const firstBundle = canvas.getAllByRole('option')[0]
    await userEvent.click(firstBundle)

    // Verify that onSelect was called with the correct bundle
    await expect(args.onSelect).toHaveBeenCalledWith(mockBundleSpec('main', '2025-05-14T10:00:00.000Z'))
  }}
></Story>

<Story
  name="Column Headers"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(remoteBundles)
  }}
  play={async ({ canvas }) => {
    // Verify column headers are present and labeled correctly
    await expect(canvas.getByRole('button', { name: /Name/i })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /Last Modified/i })).toBeInTheDocument()
  }}
></Story>

<Story
  name="Download Button - Remote Only"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles([mockBundleSpec('main', '2025-05-14T10:00:00.000Z', false)])
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Get the download button (should be enabled for remote-only bundle)
    const downloadButton = canvas.getByRole('button', { name: /download/i })
    await expect(downloadButton).toBeInTheDocument()
    await expect(downloadButton).not.toBeDisabled()
  }}
></Story>

<Story
  name="Download Button - Local Bundle"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles([mockBundleSpec('main', '2025-05-14T10:00:00.000Z', true)])
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Get the download button (should be disabled for local bundle)
    const downloadButton = canvas.getByRole('button', { name: /download/i })
    await expect(downloadButton).toBeInTheDocument()
    await expect(downloadButton).toBeDisabled()
  }}
></Story>

<Story
  name="Status Bar with Reload"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles(remoteBundles)
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
    })
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
  name="Local Bundles Only"
  {template}
  args={{
    bundleManager: new BundleManager({
      getLocalBundles: async () => localBundles
    })
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify bundles are loaded
    const bundleItems = canvas.getAllByRole('option')
    await expect(bundleItems).toHaveLength(2)

    // Verify local bundles are shown (check they contain the names)
    await expect(canvas.getByText(/main/)).toBeInTheDocument()
    await expect(canvas.getByText(/local-only/)).toBeInTheDocument()
  }}
></Story>

<Story
  name="No Sources Provided"
  {template}
  args={{
    bundleManager: new BundleManager({})
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify "No bundles available" message (appears in both content and status bar)
    const messages = canvas.getAllByText('No bundles available')
    await expect(messages.length).toBeGreaterThan(0)
  }}
></Story>

<Story
  name="Local Bundles Error"
  {template}
  args={{
    bundleManager: new BundleManager({
      getLocalBundles: async () => {
        throw new Error('Simulated error')
      }
    })
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify error message is shown (might be in content or status bar)
    const errorMessages = canvas.getAllByText(/Failed to load local bundles: Simulated error/i)
    await expect(errorMessages.length).toBeGreaterThan(0)
  }}
></Story>

<Story
  name="Download Button - Local Only Bundles"
  {template}
  args={{
    bundleManager: new BundleManager({
      getLocalBundles: async () => localBundles
    })
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify download buttons exist but are disabled (since all bundles are local-only)
    const downloadButtons = canvas.getAllByRole('button', { name: /download/i })
    await expect(downloadButtons.length).toBeGreaterThan(0)

    // All download buttons should be disabled since bundles are local-only
    downloadButtons.forEach(async button => {
      await expect(button).toBeDisabled()
    })
  }}
></Story>
