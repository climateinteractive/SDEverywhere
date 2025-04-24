<!-- SCRIPT -->
<script lang='ts'>
import { _ } from 'svelte-i18n'

import './global.css'

import type { AppViewModel } from './app-vm'

import SelectableGraph from './components/graph/selectable-graph.svelte'
import Selector from './components/selector/selector.svelte'
import Slider from './components/slider/slider.svelte'

export let viewModel: AppViewModel
const scenarios = viewModel.scenarios

type Layout = 'layout_1_1' | 'layout_1_2' | 'layout_2_2'
let selectedLayout: Layout = 'layout_1_1'
const layoutOptions = [
  { value: 'layout_1_1', stringKey: '1', maxVisible: 1 },
  { value: 'layout_1_2', stringKey: '2', maxVisible: 2 },
  { value: 'layout_2_2', stringKey: '4', maxVisible: 4 }
]

$: selectedLayoutOption = layoutOptions.find(option => option.value === selectedLayout)
$: visibleGraphContainers = viewModel.graphContainers.slice(0, selectedLayoutOption.maxVisible)
</script>

<!-- TEMPLATE -->
<div class="app-container">
  <div class="options-container">
    <div class="layout-label">Max Visible Graphs:</div>
    <Selector
      options={layoutOptions}
      bind:value={selectedLayout}
      onSelect={() => {}}
    />
  </div>
  <div class="main-container">
    <div class="top-container">
      <div class="graphs-container {selectedLayout}">
        {#each visibleGraphContainers as graphContainer}
          <div class="selectable-graph-container">
            <SelectableGraph viewModel={graphContainer} />
          </div>
        {/each}
      </div>
    </div>
    <div class="bottom-container">
      {#each $scenarios as scenario}
        <div class="scenario-container">
          {#if $scenarios.length > 1}
            <div class="scenario-name">{scenario.name}</div>
          {/if}
          {#each scenario.sliders as slider}
            <Slider
              input={slider}
              label={$_(slider.spec.labelKey)}
              min={slider.spec.minValue}
              max={slider.spec.maxValue}
              step={slider.spec.step}
            />
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- STYLE -->
<style lang='sass'>
.app-container
  display: flex
  flex-direction: column
  gap: 10px
  box-sizing: border-box
  height: 100vh
  padding: 10px

.options-container
  display: flex
  flex-direction: row
  align-items: baseline
  margin-bottom: 4px
  margin-left: 4px
  gap: 10px

.main-container
  display: flex
  flex-direction: column
  gap: 10px
  max-width: 800px
  height: calc(100% - 20px)
  min-height: 0

.top-container
  display: flex
  flex-direction: column
  gap: 10px
  flex-shrink: 0

.graphs-container
  display: grid
  gap: 10px
  &.layout_1_1
    grid-template: 1fr
  &.layout_1_2
    grid-template-columns: 1fr 1fr
  &.layout_2_2
    grid-template: 1fr 1fr / 1fr 1fr

.selectable-graph-container
  display: flex
  box-sizing: border-box
  width: 100%
  height: 300px
  padding: 10px
  border-radius: 10px
  border: 1px solid #ddd
  background-color: #fff
  .graphs-container.layout_1_1 &
    height: 450px
    max-height: 50vh
  .graphs-container.layout_2_2 &
    height: 250px
    max-height: 30vh

.bottom-container
  display: flex
  flex-direction: row
  justify-content: space-evenly
  gap: 10px
  min-height: 0
  overflow: hidden

.scenario-container
  display: flex
  flex-direction: column
  width: 300px
  padding: 10px
  border-radius: 10px
  border: 1px solid #ccc
  background-color: #eee
  min-height: 0
  overflow-y: auto

.scenario-name
  margin-bottom: 10px
  color: #777
  font-size: .9em
  font-weight: 700
</style>
