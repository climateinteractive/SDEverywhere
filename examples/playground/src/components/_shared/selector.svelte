<!-- XXX: Svelte complains if we use `on:change` (they prefer `on:blur`); we silence the warning -->
<!-- svelte-ignore a11y-no-onchange -->

<!-- SCRIPT -->
<script lang='ts'>

import { get } from 'svelte/store'

import type { SelectorViewModel } from './selector-vm'

export let viewModel: SelectorViewModel
const selectedValue = viewModel.selectedValue

function onChange() {
  // Note: The `change` event is only emitted when the user makes a change,
  // which is what we want.  The `selectedValue` is updated before the
  // `change` event is emitted, so it reflects the current value here.
  viewModel.onUserChange?.(get(selectedValue))
}

</script>




<!-- TEMPLATE -->
<template>

<select bind:value={$selectedValue} on:change={onChange} size=5>
  {#each viewModel.options as option}
    <option value={option.value} disabled={option.disabled} hidden={option.hidden}>{ @html option.label }</option>
  {/each}
</select>

</template>




<!-- STYLE -->
<style lang="sass">

select
  width: 100%
  max-height: 100px
  overflow: auto
  background-color: #333
  border: solid 1px #777
  color: #fff

select > option
  /*
   * XXX: Firefox doesn't support @font-face in select menus, so
   * the best we can do is try a similar sans serif font
   */
  font-family: Helvetica, sans-serif
  color: #fff

</style>
