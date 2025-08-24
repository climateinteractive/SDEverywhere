<!-- SCRIPT -->
<script lang='ts'>

import './global.css'

import Selector from './components/_shared/selector.svelte'
import Graph from './components/graph/graph.svelte'

import { AppViewModel } from './app-vm'

const appViewModel = new AppViewModel()
const sourceModel = appViewModel.sourceModel
const generatedModelInfo = appViewModel.generatedModelInfo
const varSelectorViewModel = appViewModel.varSelector
const selectedVarGraphViewModel = appViewModel.selectedVarGraph

</script>




<!-- TEMPLATE -->
<template>

<div class="app-container">
  <div class="column">
    <textarea bind:value={$sourceModel} spellcheck="false" />
  </div>

  {#if $generatedModelInfo}
    <div class="column">
      <textarea disabled>{$generatedModelInfo.jsCode || ''}</textarea>
    </div>

    <div class="column">
      {#if $varSelectorViewModel}
        <Selector viewModel={$varSelectorViewModel}/>
      {/if}
      <div class="graph-container">
        {#if $selectedVarGraphViewModel}
          <Graph viewModel={$selectedVarGraphViewModel} width={400} height={300}/>
        {/if}
      </div>
    </div>
  {/if}
</div>

</template>




<!-- STYLE -->
<style lang='sass'>

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

.graph-container
  position: relative
  width: 400px
  height: 300px
  margin-top: 20px

</style>
