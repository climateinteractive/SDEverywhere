<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

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
<template lang='pug'>

include selector.pug

select(bind:value!='{$selectedValue}' on:change!='{onChange}')
  +options

</template>




<!-- STYLE -->
<style lang='sass'>

select
  width: auto
  font-family: inherit
  font-size: inherit
  color: inherit
  // Note: The following values were derived from bootstrap
  margin: 0
  background-color: #fff
  background-image: none
  border: 1px solid #ccc
  border-radius: 0
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075)
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out
  text-transform: none

select > option
  // XXX: Firefox doesn't support @font-face in select menus, so
  // the best we can do is try a similar sans serif font
  font-family: RobotoCondensed, Helvetica, sans-serif

</style>
