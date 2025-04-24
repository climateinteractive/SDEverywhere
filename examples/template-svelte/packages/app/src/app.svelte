<!-- SCRIPT -->
<script lang='ts'>
import { _ } from 'svelte-i18n'

import './global.css'

import type { AppViewModel } from './app-vm'

import SelectableGraph from './components/graph/selectable-graph.svelte'
import Slider from './components/slider/slider.svelte'

export let viewModel: AppViewModel
const scenarios = viewModel.scenarios
</script>

<!-- TEMPLATE -->
<div class="app-container">
  <div class="top-container">
    {#each viewModel.graphContainers as graphContainer}
      <div class="selectable-graph-container">
        <SelectableGraph viewModel={graphContainer} />
      </div>
    {/each}
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
  gap: 10px

.selectable-graph-container
  display: flex
  box-sizing: border-box
  width: 400px
  height: 300px
  padding: 10px
  border-radius: 10px
  border: 1px solid #ddd
  background-color: #fff

.bottom-container
  display: flex
  flex-direction: row
  gap: 20px

.scenario-container
  display: flex
  flex-direction: column
  padding: 10px
  border-radius: 10px
  border: 1px solid #ccc
  background-color: #eee

.scenario-name
  margin-bottom: 10px
  color: #777
  font-size: .9em
  font-weight: 700
</style>
