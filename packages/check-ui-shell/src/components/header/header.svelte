
<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'

import type { HeaderViewModel } from './header-vm'

export let viewModel: HeaderViewModel
const simplifyScenarios = viewModel.simplifyScenarios
const thresholds = viewModel.thresholds

const dispatch = createEventDispatcher()

function onHome() {
  dispatch('command', { cmd: 'show-summary' })
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

.header-container
  .header-content
    .header-group
      .label.home.no-selection(on:click!='{onHome}') Home
    .spacer-flex
    +if('simplifyScenarios !== undefined')
      .header-group
        input.checkbox(type='checkbox' name='simplify-toggle' bind:checked!='{$simplifyScenarios}')
        label(for='simplify-toggle') Simplify Scenarios
    +if('viewModel.nameL')
      .spacer-fixed
      .header-group
        .label Comparing:
        .label.dataset-color-0 {viewModel.nameL}
        .label.dataset-color-1 {viewModel.nameR}
      .spacer-fixed
      .header-group
        .label Thresholds:
        .label.bucket-color-0 { @html thresholds[0] }
        .label.bucket-color-1 { @html thresholds[1] }
        .label.bucket-color-2 { @html thresholds[2] }
        .label.bucket-color-3 { @html thresholds[3] }
        .label.bucket-color-4 { @html thresholds[4] }
  .line

</template>




<!-- STYLE -->
<style lang='sass'>

.header-container
  display: flex
  flex-direction: column
  margin: 0 1rem
  color: #aaa

.header-content
  display: flex
  flex-direction: row
  margin: .4rem 0

.header-group
  display: flex
  flex-direction: row
  align-items: center

.spacer-flex
  flex: 1

.spacer-fixed
  flex: 0 0 4rem

.label.home
  color: #ddd
  cursor: pointer

.label.home:hover
  color: #fff

.label:not(:last-child)
  margin-right: 1rem

.line
  min-height: 1px
  margin-bottom: 1rem
  background-color: #555

</style>
