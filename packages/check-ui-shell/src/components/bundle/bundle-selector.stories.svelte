<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund. All rights reserved. -->

<script module lang="ts">
import { expect, userEvent, fn } from 'storybook/test'
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'

import type { BundleSpec } from './bundle-spec'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import BundleSelector from './bundle-selector.svelte'

function bundleSpec(branchName: string, lastModified: string, hasLocal = false): BundleSpec {
  return {
    remote: {
      url: `https://example.com/branch/${branchName}/bundles/check-bundle.js`,
      name: branchName,
      lastModified
    },
    local: hasLocal ? {
      url: `file:///bundles/${branchName}/check-bundle.js`,
      name: branchName,
      lastModified
    } : undefined
  }
}

const sampleBundles: BundleSpec[] = [
  bundleSpec('chris/123-feature', '2025-05-13T19:15:00.000Z'),
  bundleSpec('chris/456-another-feature', '2025-03-03T23:24:24.000Z'),
  bundleSpec('main', '2025-05-14T10:00:00.000Z'),
  bundleSpec('release/25.1.0', '2025-01-01T15:30:00.000Z'),
  bundleSpec('release/25.2.0', '2025-02-01T15:30:00.000Z'),
  bundleSpec('release/25.3.0', '2025-03-01T15:30:00.000Z'),
  bundleSpec('release/25.4.0', '2025-04-01T15:30:00.000Z'),
  bundleSpec('release/25.5.0', '2025-05-01T15:30:00.000Z')
]

const { Story } = defineMeta({
  title: 'Components/BundleSelector',
  component: BundleSelector,
  tags: ['autodocs'],
  args: {
    onReload: fn(),
    onSelect: fn(),
    onDownload: fn()
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
    bundles: sampleBundles,
    loading: false,
    error: ''
  }}
  play={async ({ canvas }) => {
    // Get all bundle items
    const bundleItems = canvas.getAllByRole('option')

    // Verify we have 8 bundles
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
/>

<Story
  name="Search"
  {template}
  args={{
    bundles: sampleBundles,
    loading: false,
    error: ''
  }}
  play={async ({ canvas }) => {
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
/>

<Story
  name="Empty"
  {template}
  args={{
    bundles: [],
    loading: false,
    error: ''
  }}
  play={async ({ canvas }) => {
    // Verify empty state message
    await expect(canvas.getByText('No bundles found')).toBeInTheDocument()
  }}
/>

<Story
  name="Loading"
  {template}
  args={{
    bundles: [],
    loading: true,
    error: ''
  }}
  play={async ({ canvas }) => {
    // Verify loading state message
    await expect(canvas.getByText('Loading bundles...')).toBeInTheDocument()
  }}
/>

<Story
  name="Reloading"
  {template}
  args={{
    bundles: sampleBundles,
    loading: true,
    error: ''
  }}
  play={async ({ canvas }) => {
    // Verify loading state message
    await expect(canvas.getByText('Loading bundles...')).toBeInTheDocument()
  }}
/>

<Story
  name="Error"
  {template}
  args={{
    bundles: [],
    loading: false,
    error: 'Failed to load bundles'
  }}
  play={async ({ canvas }) => {
    // Verify error state message appears (in both content and status bar)
    const errorMessages = canvas.getAllByText('Failed to load bundles')
    await expect(errorMessages.length).toBeGreaterThan(0)
  }}
/>

<Story
  name="Selection"
  {template}
  args={{
    bundles: sampleBundles,
    loading: false,
    error: ''
  }}
  play={async ({ canvas, args }) => {
    // Click on the first bundle
    const firstBundle = canvas.getAllByRole('option')[0]
    await userEvent.click(firstBundle)

    // Verify that onSelect was called with the correct bundle
    await expect(args.onSelect).toHaveBeenCalledWith(bundleSpec('main', '2025-05-14T10:00:00.000Z'))
  }}
/>

<Story
  name="Column Headers"
  {template}
  args={{
    bundles: sampleBundles,
    loading: false,
    error: ''
  }}
  play={async ({ canvas }) => {
    // Verify column headers are present and labeled correctly
    await expect(canvas.getByRole('button', { name: /Name/i })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /Last Modified/i })).toBeInTheDocument()
  }}
/>

<Story
  name="Download Button - Remote Only"
  {template}
  args={{
    bundles: [bundleSpec('main', '2025-05-14T10:00:00.000Z', false)],
    loading: false,
    error: ''
  }}
  play={async ({ canvas, args }) => {
    // Get the download button (should be enabled for remote-only bundle)
    const downloadButton = canvas.getByRole('button', { name: /download/i })
    await expect(downloadButton).toBeInTheDocument()
    await expect(downloadButton).not.toBeDisabled()

    // Click the download button
    await userEvent.click(downloadButton)

    // Verify onDownload was called with the correct bundle
    await expect(args.onDownload).toHaveBeenCalledWith(bundleSpec('main', '2025-05-14T10:00:00.000Z', false))
  }}
/>

<Story
  name="Download Button - Local Bundle"
  {template}
  args={{
    bundles: [bundleSpec('main', '2025-05-14T10:00:00.000Z', true)],
    loading: false,
    error: ''
  }}
  play={async ({ canvas }) => {
    // Get the download button (should be disabled for local bundle)
    const downloadButton = canvas.getByRole('button', { name: /download/i })
    await expect(downloadButton).toBeInTheDocument()
    await expect(downloadButton).toBeDisabled()
  }}
/>

<Story
  name="Status Bar with Reload"
  {template}
  args={{
    bundles: sampleBundles,
    loading: false,
    error: ''
  }}
  play={async ({ canvas, args }) => {
    // Find the reload button in the status bar (not in header)
    const reloadButton = canvas.getByRole('button', { name: /reload/i })
    await expect(reloadButton).toBeInTheDocument()

    // Click reload button
    await userEvent.click(reloadButton)

    // Verify onReload was called
    await expect(args.onReload).toHaveBeenCalled()
  }}
/>

<Story
  name="Status Bar - Loading State"
  {template}
  args={{
    bundles: [],
    loading: true,
    error: ''
  }}
  play={async ({ canvas }) => {
    // Verify loading message is shown in status bar
    await expect(canvas.getByText('Loading...')).toBeInTheDocument()

    // Verify reload button is disabled while loading
    const reloadButton = canvas.getByRole('button', { name: /reload/i })
    await expect(reloadButton).toBeDisabled()
  }}
/>
