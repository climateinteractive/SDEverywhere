<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund. All rights reserved. -->

<script module lang="ts">
import { expect, fn, waitFor } from 'storybook/test'
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'

import type { BundleLocation } from './bundle-spec'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import SyncedBundleSelector from './synced-bundle-selector.svelte'

const localBundles: BundleLocation[] = [
  {
    url: 'file:///bundles/main.js',
    name: 'main',
    lastModified: '2025-05-14T10:00:00.000Z'
  },
  {
    url: 'file:///bundles/local-only.js',
    name: 'local-only',
    lastModified: '2025-05-12T10:00:00.000Z'
  }
]

const { Story } = defineMeta({
  title: 'Components/SyncedBundleSelector',
  component: SyncedBundleSelector,
  tags: ['autodocs'],
  args: {
    onDownload: fn(),
    onSelect: fn()
  }
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={600} height={400}>
    <SyncedBundleSelector {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Local Bundles Only"
  {template}
  args={{
    remoteMetadataUrl: undefined,
    getLocalBundles: async () => localBundles
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
/>

<Story
  name="No Sources Provided"
  {template}
  args={{
    remoteMetadataUrl: undefined,
    getLocalBundles: undefined
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify "No bundles available" message (appears in both content and status bar)
    const messages = canvas.getAllByText('No bundles available')
    await expect(messages.length).toBeGreaterThan(0)
  }}
/>


<Story
  name="Local Bundles Error"
  {template}
  args={{
    remoteMetadataUrl: undefined,
    getLocalBundles: async () => {
      throw new Error('Failed to load local bundles')
    }
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify error message is shown (might be in content or status bar)
    const errorMessages = canvas.getAllByText(/Failed to load local bundles/i)
    await expect(errorMessages.length).toBeGreaterThan(0)
  }}
/>

<Story
  name="Download Button - Local Only Bundles"
  {template}
  args={{
    remoteMetadataUrl: undefined,
    getLocalBundles: async () => localBundles
  }}
  play={async ({ canvas }) => {
    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Verify download buttons exist but are disabled (since all bundles are local-only)
    const downloadButtons = canvas.getAllByRole('button', { name: /download/i })
    await expect(downloadButtons.length).toBeGreaterThan(0)

    // All download buttons should be disabled since bundles are local-only
    downloadButtons.forEach(async (button) => {
      await expect(button).toBeDisabled()
    })
  }}
/>
