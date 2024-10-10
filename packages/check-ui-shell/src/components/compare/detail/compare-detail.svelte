<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher, onMount } from 'svelte'
import { get, type Readable } from 'svelte/store'

import ContextMenu from '../../_shared/context-menu.svelte'

import type { CompareDetailViewModel } from './compare-detail-vm'
import type { CompareDetailBoxViewModel } from './compare-detail-box-vm'
import type { CompareDetailRowViewModel } from './compare-detail-row-vm'
import DetailRow from './compare-detail-row.svelte'
import GraphsRow from './compare-graphs-row.svelte'

export let viewModel: CompareDetailViewModel
let itemKind: string
let pinnedDetailRows: Readable<CompareDetailRowViewModel[]>

let scrollContainer: HTMLElement
let scrollContent: HTMLElement

interface ContextMenuBoxSource {
  kind: 'box'
  boxViewModel: CompareDetailBoxViewModel
}
type ContextMenuSource = ContextMenuBoxSource

let contextMenuSource: ContextMenuSource
let contextMenuItems: any[] = []
let contextMenuEvent: Event
let relatedItemsVisible = false

// Rebuild the view state when the view model changes
$: if (viewModel) {
  itemKind = viewModel.kind === 'by-dataset' ? 'Scenarios' : 'Datasets'
  pinnedDetailRows = viewModel.pinnedDetailRows
  if (scrollContainer) {
    scrollContainer.scrollTop = 0
  }
  relatedItemsVisible = false
}

const dispatch = createEventDispatcher()

function onNavLink(cmd: string) {
  switch (cmd) {
    case 'detail-previous':
    case 'detail-next':
      dispatch('command', {
        cmd: cmd === 'detail-previous' ? 'show-comparison-detail-for-previous' : 'show-comparison-detail-for-next',
        kind: viewModel.kind,
        summaryRowKey: viewModel.summaryRowKey
      })
      break
    default:
      dispatch('command', { cmd })
      break
  }
}

function onShowContextMenu(e: CustomEvent) {
  // TODO: Customize menu depending on kind of item
  if (e.detail.kind === 'box') {
    const pinnedItemKey = e.detail.boxViewModel.pinnedItemKey
    const pinned = get(viewModel.pinnedItemState.getPinned(pinnedItemKey))
    contextMenuSource = e.detail
    contextMenuItems = [
      {
        key: 'toggle-box-pinned',
        displayText: pinned ? 'Unpin Item' : 'Pin Item',
      }
    ]
    contextMenuEvent = e.detail.clickEvent
  } else {
    contextMenuSource = undefined
    contextMenuItems = []
    contextMenuEvent = undefined
  }
}

function onHideContextMenu() {
  contextMenuEvent = undefined
}

function onContextMenuItemSelected(e: CustomEvent) {
  // Hide the context menu
  contextMenuEvent = undefined

  // Handle the command
  const cmd = e.detail
  switch (cmd) {
    case 'toggle-box-pinned':
      if (contextMenuSource?.kind === 'box') {
        const key = contextMenuSource.boxViewModel.pinnedItemKey
        viewModel.pinnedItemState.toggleItemPinned(key)
      }
      break
    default:
      console.error(`ERROR: Unhandled context menu command '${cmd}'`)
      break
  }
}

function onKeyDown(event: KeyboardEvent) {
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
<template lang='pug'>

include compare-detail.pug

svelte:window(on:keydown!='{onKeyDown}')

.compare-detail-container
  .header-container
    .title-and-links
      .title-container
        +if('viewModel.pretitle')
          .pretitle { @html viewModel.pretitle }
        .title-and-subtitle
          .title(on:click!='{toggleRelatedItems}') { @html viewModel.title }
          +if('viewModel.subtitle')
            .subtitle { @html viewModel.subtitle }
          +if('viewModel.annotations')
            .annotations { @html viewModel.annotations }
      .spacer-flex
      .nav-links.no-selection
        .nav-link(on:click!='{() => onNavLink("detail-previous")}') previous
        .nav-link-sep &nbsp;|&nbsp;
        .nav-link(on:click!='{() => onNavLink("detail-next")}') next
    +if('relatedItemsVisible && viewModel.relatedItems.length > 0')
      .related
        span { viewModel.relatedListHeader }
        ul
          +related-items
  .scroll-container(bind:this!='{scrollContainer}' tabindex='0')
    .scroll-content(bind:this!='{scrollContent}')
      +graph-sections
      +pinned-box-rows
      +regular-box-rows
      ContextMenu(items!='{contextMenuItems}' parentElem!='{scrollContent}' initialEvent!='{contextMenuEvent}' on:item-selected!='{onContextMenuItemSelected}' on:clickout!='{onHideContextMenu}')

</template>




<!-- STYLE -->
<style lang='sass'>

.compare-detail-container
  display: flex
  flex-direction: column
  flex: 1

.header-container
  display: flex
  flex-direction: column
  // XXX: Use negative margin to make the shadow stretch all the way
  // across, then use extra padding to compensate
  width: calc(100vw - 2rem)
  margin: 0 -1rem
  padding: 0 2rem
  box-shadow: 0 1rem .5rem -.5rem rgba(0,0,0,.5)
  z-index: 1

.title-and-links
  display: flex
  flex-direction: row
  align-items: center
  // XXX: Use a fixed height for now so that it doesn't bounce around when
  // the title wraps to two lines
  height: 4.5rem

.spacer-flex
  flex: 1

.nav-links
  display: flex
  flex-direction: row
  font-size: .8em

.nav-link-sep
  color: #444

.nav-link
  cursor: pointer
  color: #777

// .nav-link.disabled
//   cursor: not-allowed
//   color: #555

.title-container
  display: flex
  flex-direction: column

.pretitle
  margin-bottom: .2rem
  font-size: .9em
  font-weight: 700
  color: #aaa

.title-and-subtitle
  display: flex
  flex-direction: row
  align-items: baseline

.title
  margin-bottom: .4rem
  font-size: 2em
  font-weight: 700
  cursor: pointer

.subtitle
  font-size: 1.2em
  font-weight: 700
  margin-left: 1.2rem
  color: #aaa

.annotations
  margin-left: .3rem
  color: #aaa

.annotations :global(.annotation)
  margin: 0 .3rem
  padding: .1rem .3rem
  background-color: #222
  border: .5px solid #555
  border-radius: .4rem

.related
  font-size: 1em
  color: #aaa
  margin-bottom: .6rem

ul
  margin: .1rem 0
  padding-left: 2rem

.related :global(.related-sep)
  color: #666

.scroll-container
  display: flex
  flex-direction: row
  max-width: 100vw
  flex: 1 0 1px
  overflow: auto
  outline: none
  background-color: #3c3c3c

.scroll-content
  position: relative

.section-title
  font-size: 2em
  font-weight: 700
  margin-top: 2rem
  margin-bottom: 2rem
  padding: 0 1rem

.row-container
  display: flex
  flex-direction: row
  margin-top: .5rem
  margin-bottom: 3rem
  margin-left: 1rem
  margin-right: 1rem

.row-container:first-child
  margin-top: 3rem

.separator
  width: calc(100vw - 2rem)
  min-height: 1px
  margin: 4rem 1rem 4rem 1rem
  background-color: #888

</style>
