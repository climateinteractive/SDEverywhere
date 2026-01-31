<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Icon, { type IconType } from 'svelte-awesome/components/Icon.svelte'

import Button from './button.svelte'

interface Props {
  icon: IconType
  class?: string
  disabled?: boolean
  ariaLabel?: string
  onClick?: () => void
}

let { icon, class: classes = '', disabled, ariaLabel, onClick }: Props = $props()
</script>

<!-- TEMPLATE -->
<Button class="icon-button {classes}" {disabled} {ariaLabel} {onClick}>
  <Icon class="icon" data={icon} />
</Button>

<!-- STYLE -->
<style lang="scss">
$button-size: 24px;
$icon-size: 16px;

:global(.button.icon-button) {
  width: $button-size;
  min-width: $button-size;
  height: $button-size;
  min-height: $button-size;
  padding: 0 !important;
}

:global(.icon-button .icon) {
  width: $icon-size;
  height: $icon-size;
}
</style>
