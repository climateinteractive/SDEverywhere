<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund. All rights reserved. -->

<script module lang="ts">
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
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

<Story
  name="Context menu - click outside to dismiss"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Get the first bundle item
    const bundleItems = canvas.getAllByRole('option')
    const firstItem = bundleItems[0]

    // Right-click to open context menu
    await userEvent.pointer({ keys: '[MouseRight>]', target: firstItem })

    // Verify context menu is visible
    const contextMenu = await waitFor(() => canvas.getByRole('menuitem'))
    await expect(contextMenu).toBeInTheDocument()

    // Click outside the context menu to dismiss it
    await userEvent.click(canvasElement)

    // Verify context menu is no longer visible
    await waitFor(() => expect(canvas.queryByRole('menuitem')).not.toBeInTheDocument())
  }}
></Story>

<Story
  name="Context menu - press escape to dismiss"
  {template}
  args={{
    bundleManager: bundleManagerFromBundles()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Wait for loading to complete
    await waitFor(() => expect(canvas.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 })

    // Get the first bundle item
    const bundleItems = canvas.getAllByRole('option')
    const firstItem = bundleItems[0]

    // Right-click to open context menu
    await userEvent.pointer({ keys: '[MouseRight>]', target: firstItem })

    // Verify context menu is visible
    const contextMenu = await waitFor(() => canvas.getByRole('menuitem'))
    await expect(contextMenu).toBeInTheDocument()

    // Press Escape to dismiss the context menu
    await userEvent.keyboard('{Escape}')

    // Verify context menu is no longer visible
    await waitFor(() => expect(canvas.queryByRole('menuitem')).not.toBeInTheDocument())
  }}
></Story>
