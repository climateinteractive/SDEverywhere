<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import SearchList from './search-list.svelte'
import { SearchListViewModel } from './search-list-vm.svelte'
import { ListItemViewModel } from './list-item-vm.svelte'

const { Story } = defineMeta({
  title: 'Components/List/SearchList',
  component: SearchList
})

// Mock data for tests
const mockItems = [
  new ListItemViewModel('item1', 'Apple'),
  new ListItemViewModel('item2', 'Banana'),
  new ListItemViewModel('item3', 'Cherry'),
  new ListItemViewModel('item4', 'Date'),
  new ListItemViewModel('item5', 'Elderberry')
]

function createMockViewModel(): SearchListViewModel {
  const vm = new SearchListViewModel(mockItems)
  return vm
}
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={400} height={300}>
    <SearchList viewModel={args.viewModel} />
  </StoryDecorator>
{/snippet}

<Story
  name="Default"
  {template}
  args={{
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify the search input is present
    const searchInput = canvas.getByRole('textbox')
    await expect(searchInput).toBeInTheDocument()
    await expect(searchInput).toHaveAttribute('placeholder', 'Search variables...')

    // Verify all items are displayed initially
    await waitFor(() => {
      const items = canvas.getAllByRole('option')
      expect(items).toHaveLength(5)
    })

    // Verify item labels are displayed
    const appleItem = canvas.getByText('Apple')
    const bananaItem = canvas.getByText('Banana')
    await expect(appleItem).toBeInTheDocument()
    await expect(bananaItem).toBeInTheDocument()
  }}
></Story>

<Story
  name="Filter Items"
  {template}
  args={{
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Find the search input
    const searchInput = canvas.getByRole('textbox')
    await expect(searchInput).toBeInTheDocument()

    // Type to filter for items containing 'a'
    await userEvent.type(searchInput, 'a')

    // Verify only matching items are shown
    await waitFor(() => {
      const appleItem = canvas.getByText('Apple')
      const bananaItem = canvas.getByText('Banana')
      expect(appleItem).toBeInTheDocument()
      expect(bananaItem).toBeInTheDocument()
    })

    // Verify non-matching items are not shown
    const cherryItem = canvas.queryByText('Cherry')
    const dateItem = canvas.queryByText('Date')
    const elderberryItem = canvas.queryByText('Elderberry')
    await expect(cherryItem).not.toBeInTheDocument()
    await expect(dateItem).not.toBeInTheDocument()
    await expect(elderberryItem).not.toBeInTheDocument()
  }}
></Story>

<Story
  name="Keyboard Navigation"
  {template}
  args={{
    viewModel: (() => {
      const vm = createMockViewModel()
      vm.onItemSelected = () => {
        // Item selected - verified by UI state changes in the test
      }
      return vm
    })()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Focus the search input
    const searchInput = canvas.getByRole('textbox')
    await searchInput.focus()

    // Press down arrow to select first item
    await userEvent.keyboard('{ArrowDown}')

    // Verify first item is highlighted (active)
    await waitFor(() => {
      const items = canvas.getAllByRole('option')
      expect(items[0]).toHaveClass('active')
    })

    // Press down arrow again to select second item
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => {
      const items = canvas.getAllByRole('option')
      expect(items[1]).toHaveClass('active')
      expect(items[0]).not.toHaveClass('active')
    })

    // Press Enter to select the active item
    await userEvent.keyboard('{Enter}')

    // Verify the search input is cleared after selection
    await waitFor(() => {
      expect(searchInput).toHaveValue('')
    })
  }}
></Story>

<Story
  name="Mouse Selection"
  {template}
  args={{
    viewModel: (() => {
      const vm = createMockViewModel()
      vm.onItemSelected = () => {
        // Item selected - verified by UI state changes in the test
      }
      return vm
    })()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Click on the second item (Banana)
    const bananaItem = canvas.getByText('Banana')
    await userEvent.click(bananaItem)

    // Verify the item was selected (search input should be cleared)
    const searchInput = canvas.getByRole('textbox')
    await waitFor(() => {
      expect(searchInput).toHaveValue('')
    })
  }}
></Story>

<Story
  name="Empty Search Results"
  {template}
  args={{
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Find the search input
    const searchInput = canvas.getByRole('textbox')
    await expect(searchInput).toBeInTheDocument()

    // Type a search term that won't match any items
    await userEvent.type(searchInput, 'xyz')

    // Verify no items are displayed
    await waitFor(() => {
      const items = canvas.queryAllByRole('option')
      expect(items).toHaveLength(0)
    })
  }}
></Story>
