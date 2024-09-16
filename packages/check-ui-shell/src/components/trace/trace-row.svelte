<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import type { TraceRowViewModel } from './trace-row-vm'

export let viewModel: TraceRowViewModel

</script>




<!-- TEMPLATE -->
<template>

<div class="trace-row">
  <div class="trace-var-name">{viewModel.varName}</div>
  <div class="trace-points">
    {#each viewModel.points as point}
      <div class="trace-point" class:empty={point.empty} style="background-color: {point.color}"></div>
    {/each}
  </div>
</div>

</template>




<!-- STYLE -->
<style lang='sass'>

.trace-row
  display: flex
  flex-direction: row

.trace-var-name
  font-size: 10px
  color: #fff
  width: 100px
  max-width: 100px

.trace-points
  display: flex
  flex-direction: row
  gap: 3px
  align-items: center

.trace-point
  width: 5px
  height: 5px
  &.empty
    width: 3px
    height: 3px
    background-color: unset !important
    border: solid 1px #aaa

</style>
