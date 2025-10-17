<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
// import { expect } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import { createFilterPanelViewModel, type FilterItem, type FilterStateMap } from './filter-panel-vm'
import type { FilterPopoverViewModel } from './filter-popover-vm'
import FilterPopover from './filter-popover.svelte'

const sampleCheckItems: FilterItem[] = [
  {
    key: '__all_checks',
    label: 'All checks',
    children: [
      {
        key: 'policy_sliders',
        label: 'Policy sliders',
        children: [
          {
            key: 'policy_sliders__should_do_something',
            titleParts: { title: 'Policy sliders', subtitle: 'should do something' },
            label: 'should do something'
          },
          {
            key: 'policy_sliders__should_do_another_thing',
            titleParts: { title: 'Policy sliders', subtitle: 'should do another thing' },
            label: 'should do another thing'
          }
        ]
      },
      {
        key: 'other_sliders',
        label: 'Other sliders',
        children: [
          {
            key: 'other_sliders__should_do_something',
            titleParts: { title: 'Other sliders', subtitle: 'should do something' },
            label: 'should do something'
          },
          {
            key: 'other_sliders__should_do_another_thing',
            titleParts: { title: 'Other sliders', subtitle: 'should do another thing' },
            label: 'should do another thing'
          }
        ]
      }
    ]
  }
]

const sampleScenarioItems: FilterItem[] = [
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
        key: 'other-scenarios',
        label: 'Other scenarios',
        children: [
          { key: 'coal_max', titleParts: { title: 'Coal', subtitle: 'at max' }, label: 'Coal at max' },
          { key: 'coal_min', titleParts: { title: 'Coal', subtitle: 'at min' }, label: 'Coal at min' }
        ]
      }
    ]
  }
]

function createFilterPopoverViewModel(
  checkItems: FilterItem[],
  checkStates: FilterStateMap,
  scenarioItems: FilterItem[],
  scenarioStates: FilterStateMap
): FilterPopoverViewModel {
  const checksPanel = createFilterPanelViewModel(checkItems, checkStates)
  const comparisonScenariosPanel = createFilterPanelViewModel(scenarioItems, scenarioStates)
  return {
    checksPanel,
    comparisonScenariosPanel
  }
}

const { Story } = defineMeta({
  title: 'Components/FilterPopover',
  component: FilterPopover
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={400} height={600}>
    <FilterPopover {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Default"
  {template}
  beforeEach={async ({ args }) => {
    const sampleCheckStates: FilterStateMap = new Map([
      ['policy_sliders__should_do_something', true],
      ['policy_sliders__should_do_another_thing', true],
      ['other_sliders__should_do_something', true],
      ['other_sliders__should_do_another_thing', true]
    ])
    const sampleScenarioStates: FilterStateMap = new Map([
      ['baseline', true],
      ['ngfs', true],
      ['phase_out', true],
      ['coal_max', true],
      ['coal_min', true]
    ])
    args.viewModel = createFilterPopoverViewModel(
      sampleCheckItems,
      sampleCheckStates,
      sampleScenarioItems,
      sampleScenarioStates
    )
  }}
/>
