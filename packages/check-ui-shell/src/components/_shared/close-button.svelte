<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import IconButton from './icon-button.svelte'

interface Props {
  onClick?: () => void
}

let { onClick }: Props = $props()
</script>

<!-- TEMPLATE -->
<IconButton icon="×" ariaLabel="Close" {onClick} />
