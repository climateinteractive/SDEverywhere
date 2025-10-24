<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import FilterPanel from './filter-panel.svelte'
import { createFilterPanelViewModel, type FilterItem } from './filter-panel-vm'

const sampleItems: FilterItem[] = [
  {
    key: '___all_scenarios',
    label: 'All scenarios',
    children: [
      {
        key: '___key_scenarios',
        label: 'Key scenarios',
        children: [
          { key: 'baseline', titleParts: { title: 'Baseline' }, label: 'Baseline' },
          { key: 'ngfs', titleParts: { title: 'NGFS' }, label: 'NGFS' },
          { key: 'phase_out', titleParts: { title: 'Phase-out' }, label: 'Phase-out' }
        ]
      },
      {
        key: '___other_scenarios',
        label: 'Other scenarios',
        children: [
          { key: 'coal_max', titleParts: { title: 'Coal', subtitle: 'at max' }, label: 'Coal at max' },
          { key: 'coal_min', titleParts: { title: 'Coal', subtitle: 'at min' }, label: 'Coal at min' }
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
    const initialStates = {
      baseline: true,
      ngfs: true,
      phase_out: true,
      coal_max: true,
      coal_min: true
    }
    args.viewModel = createFilterPanelViewModel(sampleItems, initialStates)
  }}
/>

<Story
  name="All Checked"
  {template}
  beforeEach={async ({ args }) => {
    const initialStates = {
      baseline: true,
      ngfs: true,
      phase_out: true,
      coal_max: true,
      coal_min: true
    }
    args.viewModel = createFilterPanelViewModel(sampleItems, initialStates)
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
    const initialStates = {
      baseline: false,
      ngfs: false,
      phase_out: false,
      coal_max: false,
      coal_min: false
    }
    args.viewModel = createFilterPanelViewModel(sampleItems, initialStates)
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
    const initialStates = {
      baseline: true,
      ngfs: true,
      phase_out: true,
      coal_max: true,
      coal_min: true
    }
    args.viewModel = createFilterPanelViewModel(sampleItems, initialStates)
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

<Story
  name="Expand/Collapse"
  {template}
  beforeEach={async ({ args }) => {
    const initialStates = {
      baseline: true,
      ngfs: true,
      phase_out: true,
      coal_max: true,
      coal_min: true
    }
    args.viewModel = createFilterPanelViewModel(sampleItems, initialStates)
  }}
  play={async ({ canvasElement, userEvent }) => {
    // All nodes should be expanded by default now
    const keyScenariosSection = canvasElement.querySelector('[data-testid="___key_scenarios-children"]')
    const otherScenariosSection = canvasElement.querySelector('[data-testid="___other_scenarios-children"]')

    // Verify that all children are initially visible
    if (keyScenariosSection && otherScenariosSection) {
      await expect(keyScenariosSection).toHaveStyle('display: block')
      await expect(otherScenariosSection).toHaveStyle('display: block')
    }

    // Click the collapse triangle for "Key scenarios"
    const keyScenariosTriangle = canvasElement.querySelector('[data-testid="___key_scenarios-triangle"]')
    await userEvent.click(keyScenariosTriangle!)

    // Verify that "Key scenarios" children are now hidden
    await expect(keyScenariosSection).toHaveStyle('display: none')
    await expect(otherScenariosSection).toHaveStyle('display: block')

    // Click the expand triangle for "Key scenarios" again
    await userEvent.click(keyScenariosTriangle!)

    // Verify that "Key scenarios" children are now visible again
    await expect(keyScenariosSection).toHaveStyle('display: block')
    await expect(otherScenariosSection).toHaveStyle('display: block')

    // Click the collapse triangle for "Other scenarios"
    const otherScenariosTriangle = canvasElement.querySelector('[data-testid="___other_scenarios-triangle"]')
    await userEvent.click(otherScenariosTriangle!)

    // Verify that "Other scenarios" children are now hidden
    await expect(keyScenariosSection).toHaveStyle('display: block')
    await expect(otherScenariosSection).toHaveStyle('display: none')

    // Verify that checkboxes still work when nodes are collapsed
    const allScenariosInput = canvasElement.querySelector('input[type="checkbox"]')
    await expect(allScenariosInput).toBeChecked()
    await userEvent.click(allScenariosInput!)
    await expect(allScenariosInput).not.toBeChecked()
  }}
/>
