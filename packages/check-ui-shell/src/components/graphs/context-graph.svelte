<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import assertNever from 'assert-never'
import copyToClipboard from 'copy-text-to-clipboard'

import type { LinkItem } from '@sdeverywhere/check-core'

import Lazy from '../_shared/lazy.svelte'

import type { ContextGraphViewModel } from './context-graph-vm'
import type { GraphViewConfig } from './graph-view-config'
import Graph from './graph.svelte'

export let viewModel: ContextGraphViewModel
let content = viewModel.content
let visible = false

// If the width value is changed here, be sure to change the
// `graph-width` Sass variable below to match
const graphConfig: GraphViewConfig = {
  width: 38
}

// Rebuild the view state when the view model changes
let previousVisible = visible
let previousViewModel: ContextGraphViewModel
$: if (visible !== previousVisible || viewModel.requestKey !== previousViewModel?.requestKey) {
  // If the view model is changing, or if the current view is becoming not visible,
  // clear the data in the view model
  previousViewModel?.clearData()
  previousVisible = visible
  previousViewModel = viewModel
  content = viewModel.content

  // Load the data when this view becomes visible
  if (visible) {
    viewModel.requestData()
  }
}

function onLinkClicked(linkItem: LinkItem) {
  switch (linkItem.kind) {
    case 'url':
      window.open(linkItem.content, '_blank')
      break
    case 'copy':
      copyToClipboard(linkItem.content)
      break
    default:
      assertNever(linkItem.kind)
  }
}
</script>

<!-- TEMPLATE -->
<div class="context-graph-container">
  {#if viewModel.graphSpec}
    <div class="graph-and-info">
      <div class={`graph-title ${viewModel.datasetClass}`}>
        {@html viewModel.graphSpec.title}
      </div>
      {#if viewModel.requestKey}
        <div class="graph-container">
          <Lazy bind:visible>
            {#if $content && $content.graphData}
              <Graph viewModel={$content.graphData} config={graphConfig} />
            {/if}
          </Lazy>
        </div>
        {#if viewModel.linkItems}
          <div class="link-container">
            {#each viewModel.linkItems as linkItem}
              <div class="link-row" on:click={() => onLinkClicked(linkItem)}>{linkItem.text}</div>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="message not-shown">
          <span>Graph not shown: scenario is invalid in&nbsp;</span>
          <span class={viewModel.datasetClass}>{viewModel.bundleName}</span>
        </div>
      {/if}
    </div>
  {:else}
    <div class="message not-included">
      <span>Graph not included in&nbsp;</span>
      <span class={viewModel.datasetClass}>{viewModel.bundleName}</span>
    </div>
  {/if}
</div>

<!-- STYLE -->
<style lang="scss">
// The graph columns have a fixed width of 38rem (38% of app width);
// this needs to match the `graphConfig.width` value above
$graph-width: 38rem;
$graph-height: 20rem;

.context-graph-container {
  display: inline-flex;
  flex-direction: column;
  // Use a fixed width measured in viewport-relative units
  flex: 0 0 $graph-width;
  background-color: #fff;
}

.graph-and-info {
  display: flex;
  flex-direction: column;
}

.graph-title {
  margin: 0.5rem 0;
  padding: 0 0.8rem;
  font-family: 'Roboto Condensed';
  font-size: 1.55rem;
}

.graph-container {
  display: block;
  position: relative;
  width: $graph-width;
  height: $graph-height;
}

.message {
  display: flex;
  flex: 1;
  min-height: $graph-height;
  align-items: center;
  justify-content: center;
  color: #aaa;
  border: solid 1px #fff;

  &.not-included {
    background-color: #555;
  }
}

.link-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 0.4rem;
}

.link-row {
  height: 1.2rem;
  margin: 0 0.8rem;
  color: #999;
  cursor: pointer;

  &:hover {
    color: #000;
  }
}
</style>
