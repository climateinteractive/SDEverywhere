<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { Snippet } from 'svelte'

interface Props {
  /** The additional classes to apply. */
  class?: string
  /** Whether the button is disabled. */
  disabled?: boolean
  /** Whether the button is a primary/default button. */
  primary?: boolean
  /** The aria label for the button. */
  ariaLabel?: string
  /** The click handler for the button. */
  onClick?: () => void
  /** The children of the button. */
  children?: Snippet
}

let { class: classes = '', disabled = false, primary = false, ariaLabel, onClick, children }: Props = $props()
</script>

<!-- TEMPLATE -->
<button
  class="button {classes} {primary ? 'primary' : ''}"
  {disabled}
  aria-label={ariaLabel}
  onclick={() => onClick?.()}
>
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

  &.primary {
    background-color: var(--button-bg-primary-normal);
    border-color: var(--button-bg-primary-normal);
  }

  &.primary:hover:not(:disabled) {
    background-color: var(--button-bg-primary-hover);
    border-color: var(--button-border-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
