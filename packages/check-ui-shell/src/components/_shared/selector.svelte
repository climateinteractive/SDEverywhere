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
<select bind:value={$selectedValue} on:change={onChange}>
  {#each viewModel.options as option}
    <option value={option.value} disabled={option.disabled} hidden={option.disabled} selected={option.disabled}>
      {@html option.label}
    </option>
  {/each}
</select>




<!-- STYLE -->
<style lang='scss'>

select {
  width: auto;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  // Note: The following values were derived from bootstrap
  margin: 0;
  background-color: #fff;
  background-image: none;
  border: 1px solid #ccc;
  border-radius: 0;
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  text-transform: none;

  > option {
    // XXX: Firefox doesn't support @font-face in select menus, so
    // the best we can do is try a similar sans serif font
    font-family: 'Roboto Condensed', Helvetica, sans-serif;
  }
}

</style>
