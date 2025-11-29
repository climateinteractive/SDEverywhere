<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund. All rights reserved. -->

<script module lang="ts">
import { expect, fn, waitFor } from 'storybook/test'
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'

import { bundleManagerFromBundles } from '../../_mocks/mock-bundle-manager'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import BundleSelectorPopover from './bundle-selector-popover.svelte'

const { Story } = defineMeta({
  title: 'Components/BundleSelectorPopover',
  component: BundleSelectorPopover,
  args: {
    onSelect: fn()
  }
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={600} height={400}>
    <BundleSelectorPopover {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Default"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles()
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
  }}
></Story>
