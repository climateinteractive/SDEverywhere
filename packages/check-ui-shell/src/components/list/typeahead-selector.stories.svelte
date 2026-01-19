<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import TypeaheadSelector from './typeahead-selector.svelte'

const { Story } = defineMeta({
  title: 'Components/TypeaheadSelector',
  component: TypeaheadSelector
})

const mockItems = [
  { id: 'apple', label: 'Apple' },
  { id: 'banana', label: 'Banana' },
  { id: 'cherry', label: 'Cherry' },
  { id: 'date', label: 'Date' },
  { id: 'elderberry', label: 'Elderberry' },
  { id: 'fig', label: 'Fig' },
  { id: 'grape', label: 'Grape' },
  { id: 'honeydew', label: 'Honeydew' }
]
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={300} height={400}>
    <TypeaheadSelector
      items={args.items}
      selectedId={args.selectedId}
      placeholder={args.placeholder}
      ariaLabel={args.ariaLabel}
      onSelect={args.onSelect}
    />
  </StoryDecorator>
{/snippet}

<Story
  name="Default"
  {template}
  args={{
    items: mockItems,
    selectedId: 'apple',
    placeholder: 'Search...',
    ariaLabel: 'Select item'
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify button shows selected item
    const button = canvas.getByRole('button', { name: /select item/i })
    await expect(button).toBeInTheDocument()
    await expect(button).toHaveTextContent('Apple')

    // Verify popup is not visible initially
    const popup = canvasElement.querySelector('.typeahead-selector-popup')
    await expect(popup).not.toBeInTheDocument()
  }}
></Story>

<Story
  name="Open Popup"
  {template}
  args={{
    items: mockItems,
    selectedId: 'banana',
    placeholder: 'Search...',
    ariaLabel: 'Select item'
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Click button to open popup
    const button = canvas.getByRole('button', { name: /select item/i })
    await userEvent.click(button)

    // Wait for popup to appear
    await waitFor(() => {
      const popup = canvasElement.querySelector('.typeahead-selector-popup')
      expect(popup).toBeInTheDocument()
    })

    // Verify search input is present
    const searchInput = canvas.getByPlaceholderText('Search...')
    await expect(searchInput).toBeInTheDocument()

    // Verify all items are shown
    const items = canvasElement.querySelectorAll('.typeahead-selector-item')
    await expect(items.length).toBe(8)
  }}
></Story>

<Story
  name="Filter Items"
  {template}
  args={{
    items: mockItems,
    selectedId: 'apple',
    placeholder: 'Search...',
    ariaLabel: 'Select item'
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Open popup
    const button = canvas.getByRole('button', { name: /select item/i })
    await userEvent.click(button)

    await waitFor(() => {
      const popup = canvasElement.querySelector('.typeahead-selector-popup')
      expect(popup).toBeInTheDocument()
    })

    // Type in search input
    const searchInput = canvas.getByPlaceholderText('Search...')
    await userEvent.type(searchInput, 'ber')

    // Verify filtered results
    await waitFor(() => {
      const items = canvasElement.querySelectorAll('.typeahead-selector-item')
      // Should match "Elderberry" and "Strawberry" (if it existed)
      expect(items.length).toBeGreaterThan(0)
      expect(items.length).toBeLessThan(8)
    })
  }}
></Story>

<Story
  name="Select Item"
  {template}
  args={{
    items: mockItems,
    selectedId: 'apple',
    placeholder: 'Search...',
    ariaLabel: 'Select item',
    onSelect: () => {
      // This will be called when an item is selected
    }
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Open popup
    const button = canvas.getByRole('button', { name: /select item/i })
    await userEvent.click(button)

    await waitFor(() => {
      const popup = canvasElement.querySelector('.typeahead-selector-popup')
      expect(popup).toBeInTheDocument()
    })

    // Click on an item
    const items = canvasElement.querySelectorAll('.typeahead-selector-item')
    const cherryItem = Array.from(items).find(item => item.textContent?.includes('Cherry'))
    await expect(cherryItem).toBeInTheDocument()

    if (cherryItem) {
      await userEvent.click(cherryItem as HTMLElement)
    }

    // Verify popup closes
    await waitFor(() => {
      const popup = canvasElement.querySelector('.typeahead-selector-popup')
      expect(popup).not.toBeInTheDocument()
    })
  }}
></Story>

<Story
  name="Keyboard Navigation"
  {template}
  args={{
    items: mockItems,
    selectedId: 'apple',
    placeholder: 'Search...',
    ariaLabel: 'Select item'
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Open popup
    const button = canvas.getByRole('button', { name: /select item/i })
    await userEvent.click(button)

    await waitFor(() => {
      const popup = canvasElement.querySelector('.typeahead-selector-popup')
      expect(popup).toBeInTheDocument()
    })

    // Get search input
    const searchInput = canvas.getByPlaceholderText('Search...')

    // Press down arrow to move to next item
    await userEvent.type(searchInput, '{ArrowDown}')

    // Verify second item is active
    await waitFor(() => {
      const items = canvasElement.querySelectorAll('.typeahead-selector-item')
      const secondItem = items[1]
      expect(secondItem).toHaveClass('active')
    })

    // Press up arrow to move back
    await userEvent.type(searchInput, '{ArrowUp}')

    // Verify first item is active
    await waitFor(() => {
      const items = canvasElement.querySelectorAll('.typeahead-selector-item')
      const firstItem = items[0]
      expect(firstItem).toHaveClass('active')
    })
  }}
></Story>

<Story
  name="Close On Escape"
  {template}
  args={{
    items: mockItems,
    selectedId: 'apple',
    placeholder: 'Search...',
    ariaLabel: 'Select item'
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Open popup
    const button = canvas.getByRole('button', { name: /select item/i })
    await userEvent.click(button)

    await waitFor(() => {
      const popup = canvasElement.querySelector('.typeahead-selector-popup')
      expect(popup).toBeInTheDocument()
    })

    // Press Escape
    const searchInput = canvas.getByPlaceholderText('Search...')
    await userEvent.type(searchInput, '{Escape}')

    // Verify popup closes
    await waitFor(() => {
      const popup = canvasElement.querySelector('.typeahead-selector-popup')
      expect(popup).not.toBeInTheDocument()
    })
  }}
></Story>

<Story
  name="Empty Search Results"
  {template}
  args={{
    items: mockItems,
    selectedId: 'apple',
    placeholder: 'Search...',
    ariaLabel: 'Select item'
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Open popup
    const button = canvas.getByRole('button', { name: /select item/i })
    await userEvent.click(button)

    await waitFor(() => {
      const popup = canvasElement.querySelector('.typeahead-selector-popup')
      expect(popup).toBeInTheDocument()
    })

    // Type a search query that matches nothing
    const searchInput = canvas.getByPlaceholderText('Search...')
    await userEvent.type(searchInput, 'zzz')

    // Verify empty message is shown
    await waitFor(() => {
      const emptyMessage = canvasElement.querySelector('.typeahead-selector-empty')
      expect(emptyMessage).toBeInTheDocument()
      expect(emptyMessage).toHaveTextContent('No items found')
    })
  }}
></Story>
