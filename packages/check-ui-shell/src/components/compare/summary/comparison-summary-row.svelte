<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { createEventDispatcher } from 'svelte'

import type { ComparisonSummaryRowViewModel } from './comparison-summary-row-vm'

export let viewModel: ComparisonSummaryRowViewModel
const bucketPcts = viewModel.diffPercentByBucket

const dispatch = createEventDispatcher()

function onLinkClicked() {
  if (viewModel.itemKey) {
    dispatch('command', {
      cmd: 'show-comparison-detail',
      summaryRow: viewModel
    })
  }
}

function onContextMenu(e: Event) {
  if (viewModel.groupSummary?.root.kind === 'scenario') {
    dispatch('show-context-menu', {
      kind: 'scenario',
      scenario: viewModel.groupSummary?.root,
      clickEvent: e
    })
  }
}

// function onTogglePinned() {
//   dispatch('toggle-item-pinned')
// }
</script>

<!-- TEMPLATE -->
<div class="summary-row">
  <div class="bar-container" on:click={onLinkClicked}>
    {#if viewModel.diffPercentByBucket === undefined}
      <div class="bar striped"></div>
    {:else}
      <div class="bar bucket-bg-0" style="width: {bucketPcts[0]}%;"></div>
      <div class="bar bucket-bg-1" style="width: {bucketPcts[1]}%;"></div>
      <div class="bar bucket-bg-2" style="width: {bucketPcts[2]}%;"></div>
      <div class="bar bucket-bg-3" style="width: {bucketPcts[3]}%;"></div>
      <div class="bar bucket-bg-4" style="width: {bucketPcts[4]}%;"></div>
      <div class="bar bucket-bg-5" style="width: {bucketPcts[5]}%;"></div>
    {/if}
  </div>
  <div class="title-container">
    <!-- .grouping-part Grouping goes here -->
    <div class="title-part" on:contextmenu|preventDefault={onContextMenu}>
      <div class="title" on:click={onLinkClicked}>{@html viewModel.title}</div>
      {#if viewModel.subtitle}
        <div class="subtitle" on:click={onLinkClicked}>{@html viewModel.subtitle}</div>
      {/if}
      <!-- {#if viewModel.valuesPart}
        <div class="values-part">{@html viewModel.valuesPart}</div>
      {/if} -->
      {#if viewModel.annotations}
        <div class="annotations">{@html viewModel.annotations}</div>
      {/if}
    </div>
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
$bar-width: 15rem;

.summary-row {
  display: flex;
  flex-direction: row;
  flex: 0 0 auto;
  // Align the bar with the first line of the title so that the bar stays put even when
  // the title-part wraps onto multiple lines (e.g. when annotations are long)
  align-items: flex-start;
  margin: 0.2rem 0;
  opacity: 0.8;

  &:hover {
    opacity: 1;
  }
}

.bar-container {
  display: flex;
  flex-direction: row;
  // Never shrink the colored bar; we'd rather have annotations wrap below than have
  // the bar squeezed by long annotation pills
  flex-shrink: 0;
  width: $bar-width;
  height: 0.8rem;
  // Nudge the bar down so its midline aligns with the first line of the title text
  margin-top: 0.35rem;
  cursor: pointer;
}

.bar {
  height: 0.8rem;

  &.striped {
    width: 100%;
    background: repeating-linear-gradient(
      -45deg,
      goldenrod,
      goldenrod 0.4rem,
      darkgoldenrod 0.4rem,
      darkgoldenrod 1rem
    );
  }
}

.title-container {
  display: flex;
  flex-direction: column;
  margin-left: 0.8rem;
}

// .grouping-part {
//   font-size: .7em;
//   color: #666;
// }

.title-part {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  // Wrap long annotations onto additional lines so they don't push the row wider than
  // the viewport
  flex-wrap: wrap;
  row-gap: 0.25rem;
}

.title {
  color: #fff;
  cursor: pointer;
}

.subtitle {
  font-size: 0.8em;
  margin-left: 0.6rem;
  color: #aaa;
  cursor: pointer;
}

// .values-part {
//   font-size: .8em;
//   margin-left: .6rem;
//   color: #aaa;
// }

.annotations {
  font-size: 0.8em;
  margin-left: 0.3rem;
  color: #aaa;

  :global(.annotation) {
    margin: 0 0.3rem;
    padding: 0.1rem 0.3rem;
    background-color: #1c1c1c;
    border: 0.5px solid #555;
    border-radius: 0.4rem;
  }
}
</style>
