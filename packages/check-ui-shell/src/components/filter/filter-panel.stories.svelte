<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import FilterPanel from './filter-panel.svelte'
import { createFilterPanelViewModel, type FilterItem } from './filter-panel-vm.svelte'

const sampleItems: FilterItem[] = [
  {
    key: '___all_scenarios',
    label: 'All scenarios',
    children: [
      {
        key: '___key_scenarios',
        label: 'Key scenarios',
        children: [
          { key: 'baseline', label: 'Baseline' },
          { key: 'ngfs', label: 'NGFS' },
          { key: 'phase_out', label: 'Phase-out' }
        ]
      },
      {
        key: 'other-scenarios',
        label: 'Other scenarios',
        children: [
          { key: 'coal_max', label: 'Coal at max' },
          { key: 'coal_min', label: 'Coal at min' }
        ]
      }
    ]
  }
]

const { Story } = defineMeta({
  title: 'Components/FilterPanel',
  component: FilterPanel
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={400} height={600}>
    <FilterPanel {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Default"
  {template}
  beforeEach={async ({ args }) => {
    args.viewModel = createFilterPanelViewModel(sampleItems, {
      baseline: 'checked',
      ngfs: 'checked',
      phase_out: 'checked',
      coal_max: 'checked',
      coal_min: 'checked'
    })
  }}
/>

<Story
  name="All Checked"
  {template}
  beforeEach={async ({ args }) => {
    args.viewModel = createFilterPanelViewModel(sampleItems, {
      baseline: 'checked',
      ngfs: 'checked',
      phase_out: 'checked',
      coal_max: 'checked',
      coal_min: 'checked'
    })
  }}
  play={async ({ canvasElement }) => {
    const checkboxes = canvasElement.querySelectorAll('input[type="checkbox"]')
    await expect(checkboxes.length).toBe(8)

    // Verify all checkboxes are checked
    const allCheckboxesArray = Array.from(checkboxes)
    for (const checkbox of allCheckboxesArray) {
      await expect(checkbox).toBeChecked()
    }
  }}
/>

<Story
  name="None Checked"
  {template}
  beforeEach={async ({ args }) => {
    args.viewModel = createFilterPanelViewModel(sampleItems, {
      baseline: 'unchecked',
      ngfs: 'unchecked',
      phase_out: 'unchecked',
      coal_max: 'unchecked',
      coal_min: 'unchecked'
    })
  }}
  play={async ({ canvasElement }) => {
    const checkboxes = canvasElement.querySelectorAll('input[type="checkbox"]')
    await expect(checkboxes.length).toBe(8)

    // Verify all checkboxes are unchecked
    const allCheckboxesArray = Array.from(checkboxes)
    for (const checkbox of allCheckboxesArray) {
      await expect(checkbox).not.toBeChecked()
    }
  }}
/>

<Story
  name="Update Checked State"
  {template}
  beforeEach={async ({ args }) => {
    args.viewModel = createFilterPanelViewModel(sampleItems, {
      baseline: 'checked',
      ngfs: 'checked',
      phase_out: 'checked',
      coal_max: 'checked',
      coal_min: 'checked'
    })
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    const checkboxes = canvasElement.querySelectorAll('input[type="checkbox"]')
    await expect(checkboxes.length).toBe(8)

    // Verify all checkboxes are checked
    for (const checkbox of Array.from(checkboxes)) {
      await expect(checkbox).toBeChecked()
    }

    // Get the checkboxes
    const allScenariosCheckbox = canvas.getByLabelText('All scenarios')
    const keyScenariosCheckbox = canvas.getByLabelText('Key scenarios')
    const baselineCheckbox = canvas.getByLabelText('Baseline')
    const ngfsCheckbox = canvas.getByLabelText('NGFS')
    const phaseOutCheckbox = canvas.getByLabelText('Phase-out')

    // Uncheck NGFS and verify that "Key scenarios" and "All scenarios" are now indeterminate
    await expect(ngfsCheckbox).toBeChecked()
    await userEvent.click(ngfsCheckbox)
    await expect(ngfsCheckbox).not.toBeChecked()
    await expect(keyScenariosCheckbox).toBePartiallyChecked()
    await expect(allScenariosCheckbox).toBePartiallyChecked()

    // Check "Key scenarios" and verify that all checkboxes in that group are checked
    await userEvent.click(keyScenariosCheckbox)
    await expect(allScenariosCheckbox).toBeChecked()
    await expect(keyScenariosCheckbox).toBeChecked()
    await expect(baselineCheckbox).toBeChecked()
    await expect(ngfsCheckbox).toBeChecked()
    await expect(phaseOutCheckbox).toBeChecked()

    // Uncheck "Key scenarios" and verify that all checkboxes in that group are unchecked
    await userEvent.click(keyScenariosCheckbox)
    await expect(allScenariosCheckbox).toBePartiallyChecked()
    await expect(keyScenariosCheckbox).not.toBeChecked()
    await expect(baselineCheckbox).not.toBeChecked()
    await expect(ngfsCheckbox).not.toBeChecked()
    await expect(phaseOutCheckbox).not.toBeChecked()
  }}
/>
