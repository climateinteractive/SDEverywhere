<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
// import { expect } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import type { FilterItem, FilterState } from './filter-panel-vm.svelte'
import { createFilterPopoverViewModel } from './filter-popover-vm'
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
          { key: 'policy_sliders__should_do_something', label: 'should do something' },
          { key: 'policy_sliders__should_do_another_thing', label: 'should do another thing' }
        ]
      },
      {
        key: 'other_sliders',
        label: 'Other sliders',
        children: [
          { key: 'other_sliders__should_do_something', label: 'should do something' },
          { key: 'other_sliders__should_do_another_thing', label: 'should do another thing' }
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
    const sampleCheckState: FilterState = {
      policy_sliders__should_do_something: 'checked',
      policy_sliders__should_do_another_thing: 'checked',
      other_sliders__should_do_something: 'checked',
      other_sliders__should_do_another_thing: 'checked'
    }
    const sampleScenarioState: FilterState = {
      baseline: 'checked',
      ngfs: 'checked',
      phase_out: 'checked',
      coal_max: 'checked',
      coal_min: 'checked'
    }
    args.viewModel = createFilterPopoverViewModel(
      sampleCheckItems,
      sampleCheckState,
      sampleScenarioItems,
      sampleScenarioState
    )
  }}
/>
