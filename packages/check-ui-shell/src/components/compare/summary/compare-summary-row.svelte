<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'

import type { CompareSummaryRowViewModel } from './compare-summary-row-vm'

export let viewModel: CompareSummaryRowViewModel
const bucketPcts = viewModel.diffPercentByBucket

const dispatch = createEventDispatcher()

function onLinkClicked() {
  if (viewModel.groupKey) {
    dispatch('command', {
      cmd: 'show-compare-detail',
      summaryRow: viewModel
    })
  }
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

+if('viewModel.header')
  .summary-header-row
    .header-bar
    .header-title { @html viewModel.title }
  +else
    .summary-row
      .bar-container(on:click!='{onLinkClicked}')
        +if('viewModel.diffPercentByBucket === undefined')
          .bar.striped
          +else
            .bar.bucket-bg-0(style!='width: {bucketPcts[0]}%;')
            .bar.bucket-bg-1(style!='width: {bucketPcts[1]}%;')
            .bar.bucket-bg-2(style!='width: {bucketPcts[2]}%;')
            .bar.bucket-bg-3(style!='width: {bucketPcts[3]}%;')
            .bar.bucket-bg-4(style!='width: {bucketPcts[4]}%;')
      .title-container
        //- .grouping-part Grouping goes here
        .title-part
          .title(on:click!='{onLinkClicked}') { @html viewModel.title }
          +if('viewModel.subtitle')
            .subtitle { @html viewModel.subtitle }
          +if('viewModel.valuesPart')
            .values-part { @html viewModel.valuesPart }
          +if('viewModel.messagesPart')
            .values-part { @html viewModel.messagesPart }

</template>




<!-- STYLE -->
<style lang='sass'>

.summary-row
  display: flex
  flex-direction: row
  flex: 0 0 auto
  align-items: flex-end
  margin: .2rem 0
  opacity: .8

.summary-row:hover
  opacity: 1.0

// .summary-row:nth-child(8), .summary-row:nth-child(11)
//   margin-top: 1rem

.bar-container
  display: flex
  flex-direction: row
  width: 20rem
  height: .8rem
  margin-bottom: .25rem
  cursor: pointer

.bar
  height: .8rem

.bar.striped
  width: 100%
  background: repeating-linear-gradient(-45deg, goldenrod, goldenrod .4rem, darkgoldenrod .4rem, darkgoldenrod 1rem)

.title-container
  display: flex
  flex-direction: column
  margin-left: .8rem

.grouping-part
  font-size: .7em
  color: #666

.title-part
  display: flex
  flex-direction: row
  align-items: baseline

.title
  color: #fff
  cursor: pointer

.subtitle
  font-size: .8em
  margin-left: .6rem
  color: #aaa

.values-part
  font-size: .8em
  margin-left: .6rem
  color: #aaa

.messages-part
  font-size: .8em
  margin-left: .6rem
  color: #aaa

// TODO: Add proper support for annotations
// :global(.message)
//   padding: .1rem .3rem
//   background-color: #1c1c1c
//   border: .5px solid #555
//   border-radius: .4rem

.summary-header-row
  display: flex
  flex-direction: row
  flex: 0 0 auto
  align-items: center
  margin: .4rem 0

// XXX: Merge with other bar classes
.header-bar
  display: flex
  width: 20rem
  height: 1px
  background-color: #555

.header-title
  margin-left: .8rem
  color: #fff
  font-size: 1.2em

</style>
