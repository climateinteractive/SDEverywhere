<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import Row from './trace-row.svelte'
import type { TraceViewModel } from './trace-vm'

export let viewModel: TraceViewModel
const running = viewModel.running
const groups = viewModel.groups

function onRun() {
  viewModel.run()
}

</script>




<!-- TEMPLATE -->
<template>

<div class="trace-container">
  {#if !$running}
    <button class="run" on:click={onRun} disabled={$running}>Run</button>
  {:else}
    <div>Running comparisons, please wait…</div>
  {/if}

  {#each $groups as group}
    <div class="trace-group">
      <div class="trace-group-title">{group.title}</div>
      {#each group.rows as row}
        <Row viewModel={row} />
      {/each}
    </div>
  {/each}
</div>

</template>




<!-- STYLE -->
<style lang='sass'>

.trace-container
  display: flex
  flex-direction: column
  align-items: flex-start
  padding: 0 1rem

.trace-group
  display: flex
  flex-direction: column
  &:not(:first-child)
    margin-top: 20px

.trace-group-title
  font-size: 14px
  font-weight: 700
  color: #fff
  margin-bottom: 4px

</style>
