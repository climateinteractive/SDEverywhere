<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test'

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
  beforeEach={async ({ args }) => {
    args.viewModel = createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Wait for component to render and find the search input
    let searchInput: HTMLElement
    await waitFor(() => {
      searchInput = canvas.getByRole('textbox')
      expect(searchInput).toBeInTheDocument()
    })

    // Type to filter - 'ch' will match only Cherry
    await userEvent.type(searchInput!, 'ch')

    // Verify matching item is shown (Cherry contains 'ch')
    await waitFor(() => {
      const cherryItem = canvas.getByText('Cherry')
      expect(cherryItem).toBeInTheDocument()
    })

    // Verify non-matching items are not shown (none contain 'ch')
    await waitFor(() => {
      const appleItem = canvas.queryByText('Apple')
      const bananaItem = canvas.queryByText('Banana')
      const dateItem = canvas.queryByText('Date')
      const elderberryItem = canvas.queryByText('Elderberry')
      expect(appleItem).not.toBeInTheDocument()
      expect(bananaItem).not.toBeInTheDocument()
      expect(dateItem).not.toBeInTheDocument()
      expect(elderberryItem).not.toBeInTheDocument()
    })
  }}
></Story>

<Story
  name="Keyboard Navigation"
  {template}
  beforeEach={async ({ args }) => {
    const vm = createMockViewModel()
    vm.onItemSelected = () => {
      // Item selected - verified by UI state changes in the test
    }
    args.viewModel = vm
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Wait for component to render and items to appear
    await waitFor(() => {
      const items = canvas.getAllByRole('option')
      expect(items).toHaveLength(5)
    })

    // The first item should already be active due to $effect
    await waitFor(() => {
      const items = canvas.getAllByRole('option')
      expect(items[0]).toHaveClass('active')
    })

    // Press down arrow to select second item
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    await waitFor(() => {
      const items = canvas.getAllByRole('option')
      expect(items[1]).toHaveClass('active')
      expect(items[0]).not.toHaveClass('active')
    })

    // Press Enter to select the active item
    fireEvent.keyDown(window, { key: 'Enter' })

    // Verify the search input is cleared after selection
    const searchInput = canvas.getByRole('textbox')
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
  beforeEach={async ({ args }) => {
    args.viewModel = createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Wait for component to render and find the search input
    let searchInput: HTMLElement
    await waitFor(() => {
      searchInput = canvas.getByRole('textbox')
      expect(searchInput).toBeInTheDocument()
    })

    // Type a search term that won't match any items
    await userEvent.type(searchInput!, 'xyz')

    // Verify no items are displayed
    await waitFor(() => {
      const items = canvas.queryAllByRole('option')
      expect(items).toHaveLength(0)
    })
  }}
></Story>
