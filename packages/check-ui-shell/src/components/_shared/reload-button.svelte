<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'

import IconButton from './icon-button.svelte'

interface Props {
  disabled?: boolean
  onClick?: () => void
}

let { disabled, onClick }: Props = $props()
</script>

<!-- TEMPLATE -->
<IconButton icon={faRotateRight} class="reload-button" {disabled} ariaLabel="Reload" {onClick} />

<!-- STYLE -->
<style lang="scss">
:global(.button.icon-button.reload-button .icon) {
  width: 10px;
  height: 10px;
}
</style>
