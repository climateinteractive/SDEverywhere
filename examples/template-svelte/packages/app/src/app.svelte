<!-- SCRIPT -->
<script lang="ts">
import './global.css'

import type { Config as CoreConfig } from '@core'

import type { AppViewModel } from './app-vm'
import { createAppViewModel } from './app-vm'

import InputRow from './components/inputs/input-row.svelte'
import SelectableGraph from './components/graphs/selectable-graph.svelte'
import Selector from './components/selector/selector.svelte'

export let coreConfig: CoreConfig

let viewModel: AppViewModel

$: scenarios = viewModel?.scenarios
$: selectedLayoutOption = viewModel?.selectedLayoutOption
$: visibleGraphContainers = viewModel?.graphContainers.slice(0, $selectedLayoutOption.maxVisible)

// Wait for the view model to be loaded before we render the app
const viewReady = createAppViewModel(coreConfig).then(result => {
  viewModel = result
})
</script>

<!-- TEMPLATE -->
{#await viewReady}
  <div class="loading-container"></div>
{:then}
  <div class="app-container">
    <div class="options-container">
      <div class="layout-label">Max Visible Graphs:</div>
      <Selector viewModel={viewModel.layoutSelector} />
    </div>

    <div class="main-container">
      <div class="top-container">
        {#if visibleGraphContainers.length > 0}
          <div class="graphs-container {$selectedLayoutOption.value}">
            {#each visibleGraphContainers as graphContainer}
              <div class="selectable-graph-container">
                <SelectableGraph viewModel={graphContainer} />
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-config-message">No graphs configured. You can edit 'config/graphs.csv' to get started.</div>
        {/if}
      </div>

      <div class="bottom-container">
        {#each $scenarios as scenario}
          <div class="scenario-container">
            {#if scenario.sliders.length > 0}
              <div class="scenario-header">
                <div class="scenario-name">{scenario.name}</div>
                <button on:click={() => scenario.reset()}>Reset</button>
              </div>
              {#each scenario.sliders as slider}
                <InputRow input={slider} />
              {/each}
            {:else}
              <div class="empty-config-message">
                No sliders configured. You can edit 'config/inputs.csv' to get started.
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/await}

<!-- STYLE -->
<style lang="sass">
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

.scenario-header
  display: flex
  flex-direction: row
  justify-content: space-between
  align-items: baseline

.scenario-name
  margin-bottom: 10px
  color: #777
  font-size: .9em
  font-weight: 700

.empty-config-message
  margin: 20px 0
  font-size: .9em
  text-align: center
</style>
