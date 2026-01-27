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
<select class="selector" value={viewModel.selectedValue} onchange={onChange} aria-label={ariaLabel} role="combobox">
  {#each viewModel.options as option}
    <option
      value={option.value}
      disabled={option.options.disabled === true}
      hidden={option.options.hidden === true}
    >{@html option.label}</option>
  {/each}
</select>

<!-- STYLE -->
<style lang="scss">
.selector {
  padding: 4px 8px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 12px;
  padding-right: 24px;

  &:hover {
    background-color: var(--button-bg-hover);
  }

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}
</style>
