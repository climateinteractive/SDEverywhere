<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Button from './button.svelte'

interface Props {
  icon: string
  class?: string
  disabled?: boolean
  ariaLabel?: string
  onClick?: () => void
}

let { icon, class: classes = '', disabled, ariaLabel, onClick }: Props = $props()
</script>

<!-- TEMPLATE -->
<Button class="icon-button {classes}" {disabled} {ariaLabel} {onClick}>
  <span class="icon-button-icon">{@html icon}</span>
</Button>

<!-- STYLE -->
<style lang="scss">
:global(.icon-button) {
  width: var(--button-icon-size);
  height: var(--button-icon-size);
}

:global(.icon-button) .icon-button-icon {
  font-size: 1.5rem;
}
</style>
