<!-- SCRIPT -->
<script lang='ts'>

import './global.css'

import Graph from './components/graph/graph.svelte'

import type { AppViewModel } from './app-vm'

export let appViewModel: AppViewModel
const busy = appViewModel.busy
const message = appViewModel.message
const assumptionRows = appViewModel.assumptionRows
const currentTime = appViewModel.currentTime
const currentValue = appViewModel.writableCurrentValue

function onContinue() {
  appViewModel.nextStep()
}

function onReset() {
  appViewModel.reset()
}

</script>




<!-- TEMPLATE -->
<template>

<div class="app-container">
  <div class="left-container">
    <div class="text-container">
      <div class="message">{@html $message}</div>
      {#if $currentTime > 100}
        <input class="cell-value" type="number" bind:value={$currentValue} min="0" max="20" />
      {/if}
      <div class="spacer-flex" />
      <div class="buttons">
        <button class="reset" disabled={$busy} on:click={onReset}>Reset</button>
        <button disabled={$busy} on:click={onContinue}>Continue</button>
      </div>
    </div>

    <div class="text-container assumptions">
      <div class="assumptions-title">Assumptions</div>
      <div class="assumption-rows">
        {#each $assumptionRows as row (row.label)}
          <div class="assumption-row">
            <div class="assumption-name">{row.label}</div>
            <div class="assumption-value">{@html row.value}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="right-container">
    <div class="column">
      <div class="graph-container">
        <Graph viewModel={appViewModel.supplyGraphViewModel} width={500} height={400}/>
      </div>
    </div>
  </div>
</div>

</template>




<!-- STYLE -->
<style lang='sass'>

.app-container
  display: flex
  flex-direction: row
  gap: 10px

.left-container
  display: flex
  flex-direction: column
  flex-shrink: 0
  gap: 10px
  font-family: sans-serif

.text-container
  display: flex
  flex-direction: column
  width: 250px
  height: 220px
  flex-shrink: 0
  align-items: flex-start
  gap: 10px
  padding: 10px
  border-radius: 8px
  border: solid 1px #555
  font-family: sans-serif

.message
  font-size: 14px
  line-height: 1.4
.message :global(.supply)
  // color: #1fe074
  color: magenta
  font-weight: 700
.message :global(.demand)
  color: #4080e0
  font-weight: 700

.spacer-flex
  flex: 1

.buttons
  display: flex
  flex-direction: row
  width: 100%
  justify-content: space-between

button
  background-color: transparent
  background-repeat: no-repeat
  border: solid 1px #fff
  border-radius: 8px
  padding: 4px 8px
  outline: none
  overflow: hidden
  color: #fff
  cursor: pointer
  &.reset
    border-color: #555
    color: #555
  &:disabled
    opacity: 0.5
    cursor: not-allowed
  &:hover:not(:disabled)
    background-color: rgba(128, 128, 128, 0.2)

.text-container.assumptions
  height: 180px
  gap: 4px
  color: #777

.assumptions-title
  font-weight: 700
  margin-bottom: 12px

.assumption-rows
  display: flex
  flex-direction: column
  width: 100%

.assumption-row
  display: flex
  flex-direction: row
  width: 100%
  justify-content: space-between
  font-size: 14px
  line-height: 1.4
  &:nth-child(2)
    margin-bottom: 12px

.right-container
  display: flex
  flex-direction: column
  padding: 10px
  border-radius: 8px
  border: solid 1px #555

// textarea
//   font-family: monospace
//   min-height: 600px
//   background-color: black
//   color: #fff
//   border: none
//   border-radius: 8px
//   padding: 8px

.graph-container
  position: relative
  width: 500px
  height: 300px
  margin-top: 20px

// .cell-column
//   display: flex
//   flex-direction: column

.cell-value
  max-width: 40px

</style>
