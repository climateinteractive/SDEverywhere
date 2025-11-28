<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import IconButton from './icon-button.svelte'

interface Props {
  disabled?: boolean
  onClick?: () => void
}

let { disabled, onClick }: Props = $props()
</script>

<!-- TEMPLATE -->
<IconButton icon="↻" class="reload-button" {disabled} ariaLabel="Reload" {onClick} />

<!-- STYLE -->
<style lang="scss">
:global(.reload-button .icon-button-icon) {
  // The reload icon glyph looks weird in Roboto, so use the default sans-serif font
  font-family: -apple-system, sans-serif !important;
  font-size: 1.2rem !important;
}
</style>
