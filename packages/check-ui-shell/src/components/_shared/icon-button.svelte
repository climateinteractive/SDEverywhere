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
:global(.button.icon-button) {
  width: 24px;
  height: 24px;
  padding: 0 !important;
}

:global(.icon-button .icon) {
  width: 12px;
  height: 12px;
}
</style>
