<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import SelList from './sel-list.svelte'
import { SelListViewModel } from './sel-list-vm.svelte'
import { ListItemViewModel } from './list-item-vm.svelte'

const { Story } = defineMeta({
  title: 'Components/List/SelList',
  component: SelList
})

// Mock data for tests
const mockItems = [
  new ListItemViewModel('item1', 'Option A'),
  new ListItemViewModel('item2', 'Option B'),
  new ListItemViewModel('item3', 'Option C'),
  new ListItemViewModel('item4', 'Option D')
]

function createMockViewModel(): SelListViewModel {
  const vm = new SelListViewModel(mockItems)
  return vm
}
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={300} height={200}>
    <SelList viewModel={args.viewModel} />
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

    // Verify all items are displayed
    await waitFor(() => {
      const items = canvas.getAllByRole('option')
      expect(items).toHaveLength(4)
    })

    // Verify item labels are displayed
    const optionA = canvas.getByText('Option A')
    const optionB = canvas.getByText('Option B')
    const optionC = canvas.getByText('Option C')
    const optionD = canvas.getByText('Option D')
    await expect(optionA).toBeInTheDocument()
    await expect(optionB).toBeInTheDocument()
    await expect(optionC).toBeInTheDocument()
    await expect(optionD).toBeInTheDocument()

    // Verify no item is selected initially
    const items = canvas.getAllByRole('option')
    items.forEach(item => {
      expect(item.closest('.item')).not.toHaveClass('active')
    })
  }}
></Story>

<Story
  name="Select First Item"
  {template}
  args={{
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Click on the first item (Option A)
    const optionA = canvas.getByText('Option A')
    await userEvent.click(optionA)

    // Verify the first item is now selected
    await waitFor(() => {
      const optionAElement = optionA.closest('.item')
      expect(optionAElement).toHaveClass('active')
    })

    // Verify other items are not selected
    const optionB = canvas.getByText('Option B')
    const optionC = canvas.getByText('Option C')
    const optionD = canvas.getByText('Option D')
    const optionBElement = optionB.closest('.item')
    const optionCElement = optionC.closest('.item')
    const optionDElement = optionD.closest('.item')
    expect(optionBElement).not.toHaveClass('active')
    expect(optionCElement).not.toHaveClass('active')
    expect(optionDElement).not.toHaveClass('active')
  }}
></Story>

<Story
  name="Change Selection"
  {template}
  args={{
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // First, select Option A
    const optionA = canvas.getByText('Option A')
    await userEvent.click(optionA)

    await waitFor(() => {
      const optionAElement = optionA.closest('.item')
      expect(optionAElement).toHaveClass('active')
    })

    // Then select Option C
    const optionC = canvas.getByText('Option C')
    await userEvent.click(optionC)

    // Verify Option A is no longer selected and Option C is selected
    await waitFor(() => {
      const optionAElement = optionA.closest('.item')
      const optionCElement = optionC.closest('.item')
      expect(optionAElement).not.toHaveClass('active')
      expect(optionCElement).toHaveClass('active')
    })
  }}
></Story>

<Story
  name="Select Last Item"
  {template}
  args={{
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Click on the last item (Option D)
    const optionD = canvas.getByText('Option D')
    await userEvent.click(optionD)

    // Verify the last item is selected
    await waitFor(() => {
      const optionDElement = optionD.closest('.item')
      expect(optionDElement).toHaveClass('active')
    })

    // Verify other items are not selected
    const optionA = canvas.getByText('Option A')
    const optionB = canvas.getByText('Option B')
    const optionC = canvas.getByText('Option C')
    const optionAElement = optionA.closest('.item')
    const optionBElement = optionB.closest('.item')
    const optionCElement = optionC.closest('.item')
    expect(optionAElement).not.toHaveClass('active')
    expect(optionBElement).not.toHaveClass('active')
    expect(optionCElement).not.toHaveClass('active')
  }}
></Story>

<Story
  name="Pre-selected Item"
  {template}
  args={{
    viewModel: (() => {
      const vm = createMockViewModel()
      vm.selectedItemId = 'item2' // Pre-select Option B
      return vm
    })()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify Option B is selected initially
    await waitFor(() => {
      const optionB = canvas.getByText('Option B')
      const optionBElement = optionB.closest('.item')
      expect(optionBElement).toHaveClass('active')
    })

    // Verify other items are not selected
    const optionA = canvas.getByText('Option A')
    const optionC = canvas.getByText('Option C')
    const optionD = canvas.getByText('Option D')
    const optionAElement = optionA.closest('.item')
    const optionCElement = optionC.closest('.item')
    const optionDElement = optionD.closest('.item')
    expect(optionAElement).not.toHaveClass('active')
    expect(optionCElement).not.toHaveClass('active')
    expect(optionDElement).not.toHaveClass('active')
  }}
></Story>
