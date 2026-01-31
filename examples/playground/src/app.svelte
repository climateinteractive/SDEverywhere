<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import './global.css'

import Graph from './components/graph/graph.svelte'

import { AppViewModel } from './app-vm.svelte'

const appViewModel = new AppViewModel()

// Track source model changes and recompile (debounced)
let compileTimeout: ReturnType<typeof setTimeout> | undefined
let lastCompiledSource: string = appViewModel.sourceModel

$effect(() => {
  const source = appViewModel.sourceModel
  if (source !== lastCompiledSource) {
    // Debounce recompilation to avoid too many compiles while typing
    clearTimeout(compileTimeout)
    compileTimeout = setTimeout(() => {
      lastCompiledSource = source
      appViewModel.compileModel(source)
    }, 500)
  }
})
</script>

<!-- TEMPLATE -->
<div class="app-container">
  <div class="column">
    <textarea bind:value={appViewModel.sourceModel} spellcheck="false"></textarea>
  </div>

  {#if appViewModel.generatedModelInfo}
    <div class="column">
      <textarea disabled>{appViewModel.generatedModelInfo.jsCode || ''}</textarea>
    </div>

    <div class="column">
      {#if appViewModel.varSelectorOptions.length > 0}
        <select bind:value={appViewModel.selectedVarId} size="5">
          {#each appViewModel.varSelectorOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      {/if}
      <div class="graph-container">
        {#if appViewModel.selectedVarGraph}
          <Graph viewModel={appViewModel.selectedVarGraph} width={400} height={300} />
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- STYLE -->
<style lang="sass">

.app-container
  display: flex
  flex-direction: row
  gap: 10px

.column
  display: flex
  flex-direction: column
  width: 400px

textarea
  font-family: monospace
  min-height: 600px
  background-color: black
  color: #fff
  border: none
  border-radius: 8px
  padding: 8px

select
  width: 100%
  max-height: 100px
  overflow: auto
  background-color: #333
  border: solid 1px #777
  color: #fff

select > option
  font-family: Helvetica, sans-serif
  color: #fff

.graph-container
  position: relative
  width: 400px
  height: 300px
  margin-top: 20px

</style>
