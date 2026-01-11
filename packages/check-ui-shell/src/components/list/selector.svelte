<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { SelectorViewModel } from './selector-vm.svelte'

interface Props {
  viewModel: SelectorViewModel
  ariaLabel?: string
}

let { viewModel, ariaLabel }: Props = $props()

function onChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const newValue = target.value

  // Update the view model
  viewModel.selectedValue = newValue

  // Notify listeners
  viewModel.onUserChange?.(newValue)
}
</script>

<!-- TEMPLATE -->
<select value={viewModel.selectedValue} onchange={onChange} aria-label={ariaLabel} role="combobox">
  {#each viewModel.options as option}
    <option
      value={option.value}
      disabled={option.options.disabled === true}
      hidden={option.options.hidden === true}
    >{@html option.label}</option>
  {/each}
</select>
