<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { faXmark } from '@fortawesome/free-solid-svg-icons'

import IconButton from './icon-button.svelte'

interface Props {
  onClick?: () => void
}

let { onClick }: Props = $props()
</script>

<!-- TEMPLATE -->
<IconButton icon={faXmark} ariaLabel="Close" {onClick} />
