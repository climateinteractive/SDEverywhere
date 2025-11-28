<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { Snippet } from 'svelte'

interface Props {
  class?: string
  disabled?: boolean
  ariaLabel?: string
  onClick?: () => void
  children?: Snippet
}

let { class: classes = '', disabled = false, ariaLabel, onClick, children }: Props = $props()
</script>

<!-- TEMPLATE -->
<button class="button {classes}" {disabled} aria-label={ariaLabel} onclick={() => onClick?.()}>
  {@render children?.()}
</button>

<!-- STYLE -->
<style lang="scss">
.button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  background: var(--button-bg-normal);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--button-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: 1.25rem;
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: var(--button-bg-hover);
    border-color: var(--button-border-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
