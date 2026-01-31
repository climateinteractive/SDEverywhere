<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- XXX: Svelte complains if we use `on:change` (they prefer `on:blur`); we silence the warning -->
<!-- svelte-ignore a11y_no_onchange -->

<!-- SCRIPT -->
<script lang="ts">
import { get } from 'svelte/store'

import type { SelectorViewModel } from './selector-vm'

export let viewModel: SelectorViewModel
export let ariaLabel: string | undefined = undefined
const selectedValue = viewModel.selectedValue
const initialValue = get(selectedValue)

function onChange() {
  // Note: The `change` event is only emitted when the user makes a change,
  // which is what we want.  The `selectedValue` is updated before the
  // `change` event is emitted, so it reflects the current value here.
  viewModel.onUserChange?.(get(selectedValue))
}
</script>

<!-- TEMPLATE -->
<select bind:value={$selectedValue} on:change={onChange} aria-label={ariaLabel} role="combobox">
  {#each viewModel.options as option}
    <option
      value={option.value}
      disabled={option.options.disabled === true}
      hidden={option.options.hidden === true}
      selected={option.value === initialValue}>{@html option.label}</option
    >
  {/each}
</select>
