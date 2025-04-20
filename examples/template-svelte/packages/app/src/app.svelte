<!-- SCRIPT -->
<script lang='ts'>
import { _ } from 'svelte-i18n'

import './global.css'

import type { AppViewModel } from './app-vm'

import SelectableGraph from './components/graph/selectable-graph.svelte'
import Slider from './components/slider/slider.svelte'

export let viewModel: AppViewModel
const graphViewModel = viewModel.graphContainers[0]
const scenarios = viewModel.scenarios
</script>

<!-- TEMPLATE -->
<div class="app-container">
  <div class="top-container">
    <SelectableGraph
      viewModel={viewModel.graphContainers[0]}
      width={500}
      height={400}
    />
    <SelectableGraph
      viewModel={viewModel.graphContainers[1]}
      width={500}
      height={400}
    />
  </div>
  <div class="bottom-container">
    {#each $scenarios as scenario}
    <div class="scenario-container">
      <div class="scenario-name">{scenario.name}</div>
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

<!-- STYLE -->
<style lang='sass'>
.app-container
  display: flex
  flex-direction: column
  gap: 10px

.top-container
  display: flex
  flex-direction: column
  padding: 10px

.bottom-container
  display: flex
  flex-direction: row
  padding: 10px
  gap: 20px

.scenario-container
  display: flex
  flex-direction: column
  padding: 10px
  border-radius: 10px
  border: 1px solid #ddd
  background-color: #fafafa

.scenario-name
  margin-bottom: 10px
  color: #777
  font-size: .9em
  font-weight: 700
</style>
