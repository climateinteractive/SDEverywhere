<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { Snippet } from 'svelte'

interface Props {
  /** The optional width of the decorator. */
  width?: number
  /** The height of the decorator. */
  height?: number
  /** The children content to render. */
  children?: Snippet
}

let { width, height, children }: Props = $props()

const style = $derived(
  `${width !== undefined ? `width: ${width}px;` : ''} ${height !== undefined ? `height: ${height}px;` : ''}`
)
</script>

<!-- TEMPLATE -->
<div {style}>
  {@render children?.()}
</div>

<!-- STYLE -->
<style lang="scss">
div {
  display: flex;
}
</style>
