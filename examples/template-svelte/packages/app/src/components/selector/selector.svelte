<!-- SCRIPT -->
<script lang="ts">
import { _ } from '@shared/strings'

import type { SelectorViewModel } from './selector-vm'

export let viewModel: SelectorViewModel
const selectedValue = viewModel.selectedValue

function onChange() {
  // Note: The `change` event is only emitted when the user makes a change,
  // which is what we want.  The `selectedValue` is updated before the
  // `change` event is emitted, so it reflects the current value here.
  viewModel.onUserChange?.(selectedValue.get())
}
</script>

<!-- TEMPLATE -->
<div class="selector-container">
  <select bind:value={$selectedValue} on:change={onChange}>
    {#each viewModel.options as option}
      <option value={option.value}>{$_(option.stringKey)}</option>
    {/each}
  </select>
</div>

<!-- STYLE -->
<style lang="sass">
select
  width: 100%
  padding: 4px
  font-size: inherit
  border: 1px solid #ccc
  border-radius: 4px
  background-color: white
  &:focus
    outline: none
    border-color: #0062ff
    box-shadow: 0 0 0 2px rgba(0, 98, 255, 0.2)
</style>
