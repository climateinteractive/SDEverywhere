<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import DetailBox from '../detail/compare-detail-box.svelte'

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
<template lang='pug'>

.dataset-container
  .dataset-row(on:click!='{onDatasetClicked}')
    //- TODO: Revisit this logic
    +if('legendLabelL && !legendLabelR')
      .legend-item(style='background-color: {legendColorL};') { @html legendLabelL.toUpperCase() }
      +elseif('legendLabelR')
        .legend-item(style='background-color: {legendColorR};') { @html legendLabelR.toUpperCase() }
    +if('nameL && nameR && nameL !== nameR')
      .dataset-name(class!='{bucketClass}') { nameL }
      span.dataset-arrow &nbsp;-&gt;&nbsp;
      .dataset-name(class!='{bucketClass}') { nameR }
      +elseif('nameL && !nameR')
        .dataset-name(class!='{bucketClass}') { nameL }
      +elseif('nameR')
        .dataset-name(class!='{bucketClass}') { nameR }
  +if('$detailBoxVisible')
    .detail-box-container
      DetailBox(viewModel!='{viewModel.detailBoxViewModel}')

</template>




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
