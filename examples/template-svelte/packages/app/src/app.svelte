<!-- SCRIPT -->
<script lang='ts'>

import './global.css'

import Graph from './components/graph/graph.svelte'

import type { AppViewModel } from './app-vm'

export let viewModel: AppViewModel
const graphViewModel = viewModel.selectedGraphViewModel

</script>




<!-- TEMPLATE -->
<template>

<div class="app-container">
  <div class="top-container">
    <div class="graph-container">
      <Graph viewModel={$graphViewModel} width={500} height={400}/>
    </div>
  </div>
</div>

</template>




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

.graph-container
  position: relative
  width: 500px
  height: 300px
  margin-top: 20px

</style>
