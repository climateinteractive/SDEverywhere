<!-- SCRIPT -->
<script lang='ts'>

import './global.css'

import Assumptions from './components/assumptions/assumptions.svelte'
import Graph from './components/graph/graph.svelte'

import type { AppViewModel } from './app-vm'

export let viewModel: AppViewModel
const busy = viewModel.busy
const message = viewModel.message
const assumptionsViewModel = viewModel.assumptions
const currentTime = viewModel.currentTime
const currentValue = viewModel.writableCurrentValue

function onContinue() {
  viewModel.nextStep()
}

function onReset() {
  viewModel.reset()
}

</script>




<!-- TEMPLATE -->
<template>

<div class="app-container">
  <div class="left-container">
    <div class="text-container">
      <div class="message">{@html $message}</div>
      {#if $currentTime > 30}
        <input class="cell-value" type="number" bind:value={$currentValue} min="0" max="20" />
      {/if}
      <div class="spacer-flex" />
      <div class="buttons">
        <button class="reset" disabled={$busy} on:click={onReset}>Reset</button>
        <button disabled={$busy} on:click={onContinue}>Continue</button>
      </div>
    </div>

    <div class="text-container assumptions">
      <Assumptions viewModel={$assumptionsViewModel} />
    </div>
  </div>

  <div class="right-container">
    <div class="column">
      <div class="graph-container">
        <Graph viewModel={viewModel.supplyGraphViewModel} width={500} height={400}/>
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
