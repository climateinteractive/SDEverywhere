<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import type { FreeformViewModel } from './freeform-vm'

import Item from './freeform-item.svelte'

export let viewModel: FreeformViewModel
const items = viewModel.items

</script>




<!-- TEMPLATE -->
<template>

<div class="freeform-container">
  <div class="freeform-scroll-container">
    {#each $items as item}
      <Item viewModel={item} />
    {/each}
  </div>
</div>

</template>




<!-- STYLE -->
<style lang='sass'>

.freeform-container
  display: flex
  flex-direction: column
  flex: 1

.freeform-scroll-container
  display: flex
  // XXX: We use 1px here for flex-basis, otherwise in Firefox and Chrome the
  // whole page will scroll instead of just this container.  See also:
  //   https://stackoverflow.com/a/52489012
  flex: 1 1 1px
  flex-direction: column
  gap: 20px
  overflow: auto
  padding: 1rem
  align-items: flex-start
  outline: none
  background-color: #3c3c3c

</style>
