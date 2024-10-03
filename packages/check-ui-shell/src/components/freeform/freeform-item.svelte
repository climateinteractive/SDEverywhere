<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'

import Lazy from '../_shared/lazy.svelte'
import ComparisonGraph from '../graphs/comparison-graph.svelte'

import type { FreeformItemViewModel } from './freeform-item-vm'

export let viewModel: FreeformItemViewModel
let content = viewModel.content
let visible = false

// Rebuild the view state when the view model changes
let previousVisible = visible
let previousViewModel: FreeformItemViewModel
$: if (visible !== previousVisible || viewModel.requestKey !== previousViewModel?.requestKey) {
  // If the view model is changing, or if the current view is becoming not visible,
  // clear the data in the view model
  previousViewModel?.clearData()
  previousVisible = visible
  previousViewModel = viewModel
  content = viewModel.content

  // Load the data when this view becomes visible
  if (visible) {
    viewModel.requestData()
  }
}

const dispatch = createEventDispatcher()

function onTitleClicked() {
  dispatch('toggle')
}

</script>




<!-- TEMPLATE -->
<template>

<div class="freeform-item">
  {#if viewModel.title}
    <div class="title-row no-selection">
      <div class="title" on:click={onTitleClicked}>{@html viewModel.title}</div>
      {#if viewModel.subtitle}
        <div class="subtitle">{@html viewModel.subtitle}</div>
      {/if}
    </div>
  {/if}
  <div class="content-container">
    <Lazy bind:visible={visible}>
      {#if $content}
        <div class="content">
          <div class="graph-container">
            <ComparisonGraph viewModel={$content.comparisonGraphViewModel} width={30} height={22} />
          </div>
        </div>
      {/if}
    </Lazy>
  </div>
</div>

</template>




<!-- STYLE -->
<style lang='sass'>

.freeform-item
  display: flex
  flex-direction: column
  width: 240px
  height: 200px
  min-height: 200px
  border: solid .5px red

.freeform-item-title
  font-size: 10px
  color: #fff

</style>
