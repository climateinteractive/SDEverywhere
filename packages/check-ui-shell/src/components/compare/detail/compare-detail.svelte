<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import assertNever from 'assert-never'

import { createEventDispatcher, onMount } from 'svelte'
import { get, type Readable } from 'svelte/store'

import type { ContextMenuItem } from '../../_shared/context-menu.svelte'
import ContextMenu from '../../_shared/context-menu.svelte'
import { isEventFromEditableElement } from '../../_shared/keyboard'

import type { ComparisonGroupingKind } from '../_shared/comparison-grouping-kind'
import type { PinnedItemKey } from '../_shared/pinned-item-state'

import type { CompareDetailViewModel } from './compare-detail-vm'
import type { CompareDetailRowViewModel } from './compare-detail-row-vm'
import DetailRow from './compare-detail-row.svelte'
import GraphsRow from './compare-graphs-row.svelte'
import type { ComparisonScenario } from '@sdeverywhere/check-core'

export let viewModel: CompareDetailViewModel
let itemKind: string
let itemKindPlural: string
let pinnedDetailRows: Readable<CompareDetailRowViewModel[]>
let regularDetailRows: Readable<CompareDetailRowViewModel[]>

let scrollContainer: HTMLElement

let contextMenuSourceKey: PinnedItemKey
let contextMenuSourceScenario: ComparisonScenario | undefined
let contextMenuItems: ContextMenuItem[] = []
let contextMenuEvent: MouseEvent
let relatedItemsVisible = false

// Rebuild the view state when the view model changes
$: if (viewModel) {
  switch (viewModel.kind) {
    case 'freeform-view':
      itemKind = 'Row'
      break
    case 'scenario':
    case 'scenario-view':
      itemKind = 'Dataset'
      break
    case 'dataset':
      itemKind = 'Scenario'
      break
    default:
      itemKind = 'Item'
      break
  }
  itemKindPlural = `${itemKind}s`
  pinnedDetailRows = viewModel.pinnedDetailRows
  regularDetailRows = viewModel.regularDetailRows
  if (scrollContainer) {
    scrollContainer.scrollTop = 0
  }
  relatedItemsVisible = false
}

const dispatch = createEventDispatcher()

function onNavLink(cmd: string) {
  switch (cmd) {
    case 'detail-previous':
    case 'detail-next': {
      let groupingKind: ComparisonGroupingKind
      switch (viewModel.kind) {
        case 'freeform-view':
        case 'scenario-view':
          groupingKind = 'views'
          break
        case 'scenario':
          groupingKind = 'by-scenario'
          break
        case 'dataset':
          groupingKind = 'by-dataset'
          break
        default:
          assertNever(viewModel.kind)
      }
      dispatch('command', {
        cmd: cmd === 'detail-previous' ? 'show-comparison-detail-for-previous' : 'show-comparison-detail-for-next',
        kind: groupingKind,
        summaryRowKey: viewModel.summaryRowKey
      })
      break
    }
    default:
      dispatch('command', { cmd })
      break
  }
}

function onShowContextMenu(e: CustomEvent) {
  const eventSourceKind = e.detail?.kind
  switch (eventSourceKind) {
    case 'box':
    case 'row': {
      const pinnedItemKey = e.detail.itemKey
      const pinned = get(viewModel.pinnedItemState.getPinned(pinnedItemKey))
      const action = pinned ? 'Unpin' : 'Pin'
      const kind = eventSourceKind === 'row' ? 'Row' : itemKind
      contextMenuSourceKey = pinnedItemKey
      contextMenuSourceScenario = e.detail.scenario
      contextMenuItems = [
        {
          key: 'toggle-item-pinned',
          displayText: `${action} ${kind}`
        }
      ]
      // Include the "Move Item to Top" option if:
      //   - the item is already pinned
      //   - the item isn't already at the top
      if (pinned) {
        const orderedKeys = get(viewModel.pinnedItemState.orderedKeys)
        if (orderedKeys.length > 1 && orderedKeys[0] !== pinnedItemKey) {
          contextMenuItems.push({
            key: 'move-item-to-top',
            displayText: `Move ${kind} to Top`
          })
        }
      }
      if (kind === 'Scenario') {
        contextMenuItems.push({
          key: 'show-trace-view',
          displayText: 'Open Scenario in Trace View'
        })
      }
      contextMenuEvent = e.detail.clickEvent
      break
    }
    default:
      contextMenuSourceKey = undefined
      contextMenuSourceScenario = undefined
      contextMenuItems = []
      contextMenuEvent = undefined
      break
  }
}

function onHideContextMenu() {
  contextMenuEvent = undefined
}

function onContextMenuItemSelected(e: CustomEvent) {
  // Hide the context menu
  contextMenuEvent = undefined

  // Handle the command
  const key = contextMenuSourceKey
  const cmd = e.detail
  switch (cmd) {
    case 'toggle-item-pinned':
      viewModel.pinnedItemState.toggleItemPinned(key)
      break
    case 'move-item-to-top':
      viewModel.pinnedItemState.moveItemToTop(key)
      break
    case 'show-trace-view':
      // For now, use the `ScenarioSpec` associated with the "right" model; if it's
      // not valid, the trace view will select another scenario by default
      dispatch('command', {
        cmd: 'show-trace-view-with-scenario',
        scenarioSpec: contextMenuSourceScenario?.specR,
        scenarioKind: 'comparison'
      })
      break
    default:
      console.error(`ERROR: Unhandled context menu command '${cmd}'`)
      break
  }
}

function onKeyDown(event: KeyboardEvent) {
  // Ignore keyboard events if they originated in input fields or other editable elements
  // (since we only want to handle global-level keyboard shortcuts here)
  if (isEventFromEditableElement(event)) {
    return
  }

  if (event.key === 'ArrowLeft') {
    onNavLink('detail-previous')
    event.preventDefault()
  } else if (event.key === 'ArrowRight') {
    onNavLink('detail-next')
    event.preventDefault()
  } else if (event.key === 'ArrowUp') {
    if (scrollContainer.scrollTop === 0) {
      onNavLink('show-summary')
      event.preventDefault()
    }
  }
}

function toggleRelatedItems() {
  relatedItemsVisible = !relatedItemsVisible
}

onMount(() => {
  // Make the scroll container have focus by default to allow for easier keyboard navigation
  scrollContainer.focus()
})
</script>

<!-- TEMPLATE -->
<svelte:window on:keydown={onKeyDown} />

<div class="compare-detail-container">
  <div class="header-container">
    <div class="title-and-links">
      <div class="title-container">
        {#if viewModel.pretitle}
          <div class="pretitle">{@html viewModel.pretitle}</div>
        {/if}
        <div class="title-and-subtitle">
          <div class="title" on:click={toggleRelatedItems}>{@html viewModel.title}</div>
          {#if viewModel.subtitle}
            <div class="subtitle">{@html viewModel.subtitle}</div>
          {/if}
          {#if viewModel.annotations}
            <div class="annotations">{@html viewModel.annotations}</div>
          {/if}
        </div>
      </div>
      <div class="spacer-flex"></div>
      <div class="nav-links no-selection">
        <div class="nav-link" on:click={() => onNavLink('detail-previous')}>previous</div>
        <div class="nav-link-sep">&nbsp;|&nbsp;</div>
        <div class="nav-link" on:click={() => onNavLink('detail-next')}>next</div>
      </div>
    </div>
    {#if relatedItemsVisible && viewModel.relatedItems.length > 0}
      <div class="related">
        <span>{viewModel.relatedListHeader}</span>
        <ul>
          {#each viewModel.relatedItems as relatedItem}
            <li class="related-item">{@html relatedItem}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
  <div class="scroll-container" bind:this={scrollContainer} tabindex="0">
    <div class="scroll-content">
      {#if viewModel.graphSections.length > 0}
        {#each viewModel.graphSections as graphsSectionViewModel}
          <div class="section-title">{graphsSectionViewModel.title}</div>
          {#each graphsSectionViewModel.rows as graphsRowViewModel}
            <div class="row-container">
              <!-- XXX: Use `key` to force GraphsRow component to be recreated when the view model changes
                   (otherwise the "Dataset differences" section may show outdated items) -->
              {#key graphsRowViewModel}
                <GraphsRow viewModel={graphsRowViewModel} align="left" />
              {/key}
            </div>
          {/each}
        {/each}
        {#if $pinnedDetailRows.length === 0}
          <div class="section-title">All {itemKindPlural}</div>
        {/if}
      {/if}
      {#if $pinnedDetailRows.length > 0}
        <div class="section-title">Pinned {itemKindPlural}</div>
        {#each $pinnedDetailRows as detailRowViewModel}
          <div class="row-container">
            <DetailRow viewModel={detailRowViewModel} on:show-context-menu={onShowContextMenu} />
          </div>
        {/each}
      {/if}
      {#if $pinnedDetailRows.length > 0}
        <div class="section-title">All {itemKindPlural}</div>
      {/if}
      {#each $regularDetailRows as detailRowViewModel}
        <div class="row-container">
          <DetailRow viewModel={detailRowViewModel} on:show-context-menu={onShowContextMenu} />
        </div>
      {/each}
      <div class="footer"></div>
      <ContextMenu
        items={contextMenuItems}
        initialEvent={contextMenuEvent}
        on:item-selected={onContextMenuItemSelected}
        on:clickout={onHideContextMenu}
      />
    </div>
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.compare-detail-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.header-container {
  display: flex;
  flex-direction: column;
  // XXX: Use negative margin to make the shadow stretch all the way
  // across, then use extra padding to compensate
  width: calc(min(100%, 100vw) - 2rem);
  margin: 0 -1rem;
  padding: 0 2rem;
  box-shadow: 0 1rem 0.5rem -0.5rem rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.title-and-links {
  display: flex;
  flex-direction: row;
  align-items: center;
  // XXX: Use a fixed height for now so that it doesn't bounce around when
  // the title wraps to two lines
  height: 4.5rem;
}

.spacer-flex {
  flex: 1;
}

.nav-links {
  display: flex;
  flex-direction: row;
  font-size: 0.8em;
}

.nav-link-sep {
  color: #444;
}

.nav-link {
  cursor: pointer;
  color: #777;
}

// .nav-link.disabled
//   cursor: not-allowed
//   color: #555

.title-container {
  display: flex;
  flex-direction: column;
}

.pretitle {
  margin-bottom: 0.2rem;
  font-size: 0.9em;
  font-weight: 700;
  color: #aaa;
}

.title-and-subtitle {
  display: flex;
  flex-direction: row;
  align-items: baseline;
}

.title {
  margin-bottom: 0.4rem;
  font-size: 2em;
  font-weight: 700;
  cursor: pointer;
}

.subtitle {
  font-size: 1.2em;
  font-weight: 700;
  margin-left: 1.2rem;
  color: #aaa;
}

.annotations {
  margin-left: 0.3rem;
  color: #aaa;

  :global(.annotation) {
    margin: 0 0.3rem;
    padding: 0.1rem 0.3rem;
    background-color: #222;
    border: 0.5px solid #555;
    border-radius: 0.4rem;
  }
}

.related {
  font-size: 1em;
  color: #aaa;
  margin-bottom: 0.6rem;

  :global(.related-sep) {
    color: #666;
  }
}

ul {
  margin: 0.1rem 0;
  padding-left: 2rem;
}

.scroll-container {
  display: flex;
  flex-direction: row;
  max-width: min(100vw, 100%);
  flex: 1 0 1px;
  overflow: auto;
  outline: none;
  background-color: #3c3c3c;
}

.scroll-content {
  position: relative;
}

.section-title {
  width: calc(min(100%, 100vw) - 2rem);
  margin: 1.5rem 1rem 2rem 1rem;
  padding: 0.2rem 0;
  border-bottom: solid 1px #555;
  color: #ccc;
  font-size: 1.4em;
  font-weight: 700;

  &:not(:first-child) {
    margin-top: 5rem;
  }
}

.row-container {
  display: flex;
  flex-direction: row;
  margin-top: 0.5rem;
  margin-bottom: 3rem;
  margin-left: 1rem;
  margin-right: 1rem;

  &:first-child {
    margin-top: 3rem;
  }
}

.footer {
  height: 1rem;
}
</style>
