
<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'

import type { HeaderViewModel } from './header-vm'

export let viewModel: HeaderViewModel
const simplifyScenarios = viewModel.simplifyScenarios
const thresholds = viewModel.thresholds
const bundleNamesL = viewModel.bundleNamesL
const bundleNamesR = viewModel.bundleNamesR

const dispatch = createEventDispatcher()

function onHome() {
  dispatch('command', { cmd: 'show-summary' })
}

function onSelectBundleL(e: Event) {
  const target = e.target as HTMLSelectElement
  console.log(target.value)
  const changeEvent = new CustomEvent('sde-check-bundle', {
    detail: {
      kind: 'left',
      name: target.value
    }
  })
  document.dispatchEvent(changeEvent)
}

function onSelectBundleR(e: Event) {
  const target = e.target as HTMLSelectElement
  console.log(target.value)
  const changeEvent = new CustomEvent('sde-check-bundle', {
    detail: {
      kind: 'right',
      name: target.value
    }
  })
  document.dispatchEvent(changeEvent)
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include header.pug

.header-container
  .header-content
    .header-group
      .label.home.no-selection(on:click!='{onHome}') Home
    .spacer-flex
    +if('simplifyScenarios !== undefined')
      .header-group
        input.checkbox(type='checkbox' name='simplify-toggle' bind:checked!='{$simplifyScenarios}')
        label(for='simplify-toggle') Simplify Scenarios
    +if('viewModel.nameL || $bundleNamesL.length > 1')
      .spacer-fixed
      .header-group
        .label Comparing:
        +if('$bundleNamesL.length > 1')
          select.selector.dataset-color-0(on:change!='{onSelectBundleL}')
            +optionsL
          +else
            .label.dataset-color-0 {viewModel.nameL}
        +if('$bundleNamesR.length > 1')
          select.selector.dataset-color-1(on:change!='{onSelectBundleR}')
            +optionsR
          +else
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

// .label.baseline
//   cursor: pointer
//   &:hover
//     font-weight: 700
//     color: rgb(219, 72, 101)

select
  margin-right: 1rem
  font-family: Roboto, sans-serif
  font-size: 1em
  background-color: #353535
  border: none
  border-radius: .4rem

.line
  min-height: 1px
  margin-bottom: 1rem
  background-color: #555

</style>
