<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import type { CheckSummaryViewModel } from './check-summary-vm'
import CheckSummaryTest from './check-summary-test.svelte'

export let viewModel: CheckSummaryViewModel
let showCheckDetail = viewModel.total > 0 && viewModel.total !== viewModel.passed

function onCheckSummaryClicked() {
  showCheckDetail = !showCheckDetail
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include check-summary.pug

.check-summary-container
  .summary-bar-row
    .bar-container(on:click!='{onCheckSummaryClicked}')
      +if('viewModel.total > 0')
        .bar.status-bg-passed(style!='width: {viewModel.percents[0]}%;')
        .bar.status-bg-failed(style!='width: {viewModel.percents[1]}%;')
        .bar.status-bg-error(style!='width: {viewModel.percents[2]}%;')
        +else
          .bar.gray(style!='width: 100%')
    span.summary-label(on:click!='{onCheckSummaryClicked}')
      +if('viewModel.total === 0')
        span No checks
        +elseif('viewModel.total === viewModel.passed')
          span { viewModel.total } total passed
        +else
          span { viewModel.total } total
          +if('viewModel.passed')
            span.sep &nbsp;|&nbsp;
            span.status-color-passed {viewModel.passed} passed
          +if('viewModel.failed')
            span.sep &nbsp;|&nbsp;
            span.status-color-failed {viewModel.failed} failed
          +if('viewModel.errors')
            span.sep &nbsp;|&nbsp;
            +if('viewModel.errors > 1')
              span.status-color-error {viewModel.errors} errors
              +else
                span.status-color-error {viewModel.errors} error
  +if('showCheckDetail')
    .check-detail
      +groups

</template>




<!-- STYLE -->
<style lang='sass'>

$indent: 1rem

.check-summary-container
  display: flex
  flex-direction: column

.check-detail
  display: flex
  flex-direction: column

.group-container
  margin-bottom: 1.2rem

.group-container :global(.test-rows)
  display: flex
  flex-direction: column
 
// Hide passed rows by default
.group-container :global(.row.passed)
  display: none

// Show passed rows when parent test has `expand-all` class
.group-container :global(.test-rows.expand-all .row.passed)
  display: flex

.group-container :global(.row)
  display: flex
  flex-direction: row

.group-container :global(.row.group)
  font-size: 1.2em

.group-container :global(.row.test)
  margin-top: .4rem

.group-container :global(.row.test > .label)
  cursor: pointer

.group-container :global(.row.scenario)
  color: #777

.group-container :global(.row.dataset)
  color: #777

.group-container :global(.row.predicate)
  color: #777

.group-container :global(.row.predicate > .label)
  cursor: pointer

.group-container :global(.bold)
  font-weight: 700
  color: #bbb

.summary-bar-row
  display: flex
  flex-direction: row
  align-items: baseline
  align-self: flex-start
  margin-bottom: 1rem
  opacity: .8

.summary-bar-row:hover
  opacity: 1.0

.bar-container
  display: flex
  flex-direction: row
  width: 30rem
  height: .8rem
  cursor: pointer

.bar
  height: .8rem

.bar.gray
  background-color: #777

.summary-label
  margin-left: .8rem
  color: #fff
  cursor: pointer

.sep
  color: #777

</style>
