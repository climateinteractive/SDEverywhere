<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { Snippet } from 'svelte'

interface Props {
  /** The optional width of the decorator. */
  width?: number
  /** The optional height of the decorator. */
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
<div class="story-decorator" {style}>
  {@render children?.()}
</div>

<!-- STYLE -->
<style>
.story-decorator {
  display: flex;
  overflow: auto;
  border: 1px solid #444;
}
</style>
