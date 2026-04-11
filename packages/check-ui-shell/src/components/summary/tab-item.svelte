<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { Readable } from 'svelte/store'

interface Props {
  title: string
  subtitle: Readable<string>
  subtitleClass: Readable<string>
  selected: boolean
  onClick: () => void
}

let { title, subtitle, subtitleClass, selected, onClick }: Props = $props()
</script>

<!-- TEMPLATE -->
<div class="tab-item" class:selected onclick={() => onClick()}>
  <div class="tab-title">{title}</div>
  <div class={`tab-subtitle ${$subtitleClass}`}>{$subtitle}</div>
</div>

<!-- STYLE -->
<style lang="scss">
.tab-item {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 3rem 0.3rem 0;
  cursor: pointer;
  opacity: 0.7;
  border-bottom: solid 1px transparent;

  &:hover {
    opacity: 1;
  }

  &.selected {
    opacity: 1;
    border-bottom: solid 1px #555;
  }
}

.tab-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.2rem;
  cursor: pointer;
}

.tab-subtitle {
  font-size: 1rem;
  font-weight: 400;
}
</style>
