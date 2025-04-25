<!-- SCRIPT -->
<script lang="ts">
import { _ } from 'svelte-i18n'

import type { SelectorViewModel } from './selector-vm'

export let viewModel: SelectorViewModel
const selectedValue = viewModel.selectedValue

</script>

<!-- TEMPLATE -->
<div class="selector-container">
  <select bind:value={$selectedValue}>
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
