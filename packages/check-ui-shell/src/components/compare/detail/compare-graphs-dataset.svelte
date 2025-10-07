<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import DetailBox from './compare-detail-box.svelte'

import type { CompareGraphsDatasetViewModel } from './compare-graphs-dataset-vm'

export let viewModel: CompareGraphsDatasetViewModel
const nameL = viewModel.nameL
const nameR = viewModel.nameR
const legendColorL = viewModel.legendColorL
const legendColorR = viewModel.legendColorR
const legendLabelL = viewModel.legendLabelL
const legendLabelR = viewModel.legendLabelR
const bucketClass = viewModel.bucketClass
const detailBoxVisible = viewModel.detailBoxVisible

function onDatasetClicked() {
  detailBoxVisible.update(v => !v)
}

</script>




<!-- TEMPLATE -->
<div class="dataset-container">
  <div class="dataset-row" on:click={onDatasetClicked}>
    <!-- TODO: Revisit this logic -->
    {#if legendLabelL && !legendLabelR}
      <div class="legend-item" style="background-color: {legendColorL};">{@html legendLabelL.toUpperCase()}</div>
    {:else if legendLabelR}
      <div class="legend-item" style="background-color: {legendColorR};">{@html legendLabelR.toUpperCase()}</div>
    {/if}
    {#if nameL && nameR && nameL !== nameR}
      <div class={`dataset-name ${bucketClass}`}>{nameL}</div>
      <span class="dataset-arrow">&nbsp;-&gt;&nbsp;</span>
      <div class={`dataset-name ${bucketClass}`}>{nameR}</div>
    {:else if nameL && !nameR}
      <div class={`dataset-name ${bucketClass}`}>{nameL}</div>
    {:else if nameR}
      <div class={`dataset-name ${bucketClass}`}>{nameR}</div>
    {/if}
  </div>
  {#if $detailBoxVisible}
    <div class="detail-box-container">
      <DetailBox viewModel={viewModel.detailBoxViewModel} />
    </div>
  {/if}
</div>




<!-- STYLE -->
<style lang='sass'>

.dataset-container
  display: flex
  flex: 1
  flex-direction: column

.dataset-row
  display: flex
  flex: 1
  align-items: baseline
  margin-left: .6rem
  cursor: pointer

.dataset-row:hover
  background-color: rgba(255, 255, 255, .05)

.dataset-arrow
  color: #777

.legend-item
  font-family: 'Roboto Condensed'
  font-weight: 700
  font-size: 1rem
  margin: .2rem .4rem
  padding: .25rem .6rem .2rem .6rem
  color: #fff
  text-align: center

.detail-box-container
  display: flex
  flex: 1
  margin-top: .2rem
  margin-bottom: .8rem
  margin-left: .4rem

</style>
