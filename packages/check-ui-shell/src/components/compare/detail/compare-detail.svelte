<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'

import type { CompareDetailViewModel } from './compare-detail-vm'
import DetailRow from './compare-detail-row.svelte'
import GraphsRow from './compare-graphs-row.svelte'

export let viewModel: CompareDetailViewModel

let scrollContainer: HTMLElement
let relatedItemsVisible = false

// Rebuild the view state when the view model changes
$: if (viewModel) {
  if (scrollContainer) {
    scrollContainer.scrollTop = 0
  }
  relatedItemsVisible = false
}

const dispatch = createEventDispatcher()

function onNavLink(cmd: string) {
  switch (cmd) {
    case 'detail-previous':
      if (viewModel.previousRowIndex !== undefined) {
        dispatch('command', { cmd: 'show-compare-detail-at-index', index: viewModel.previousRowIndex })
      }
      break
    case 'detail-next':
      if (viewModel.nextRowIndex !== undefined) {
        dispatch('command', { cmd: 'show-compare-detail-at-index', index: viewModel.nextRowIndex })
      }
      break
    default:
      dispatch('command', { cmd })
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
  }
}

function toggleRelatedItems() {
  relatedItemsVisible = !relatedItemsVisible
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include compare-detail.pug

svelte:window(on:keydown!='{onKeyDown}')

.compare-detail-container
  .header-container
    .title-row
      .title-container
        .title(on:click!='{toggleRelatedItems}') { @html viewModel.title }
        +if('viewModel.subtitle')
          .subtitle { @html viewModel.subtitle }
      .spacer-flex
      .nav-links.no-selection
        .nav-link(class:disabled!='{viewModel.previousRowIndex === undefined}' on:click!='{() => onNavLink("detail-previous")}') previous
        .nav-link-sep &nbsp;|&nbsp;
        .nav-link(class:disabled!='{viewModel.nextRowIndex === undefined}' on:click!='{() => onNavLink("detail-next")}') next
    +if('relatedItemsVisible && viewModel.relatedItems.length > 0')
      .related
        span { viewModel.relatedListHeader }
        ul
          +related-items
  .scroll-container(bind:this!='{scrollContainer}')
    +graph-sections
    +box-rows

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
  margin: 0 -1rem
  padding: 0 2rem
  box-shadow: 0 1rem .5rem -.5rem rgba(0,0,0,.5)
  z-index: 1

.title-row
  display: flex
  flex-direction: row
  align-items: center
  // XXX: Use a fixed height for now so that it doesn't bounce around when
  // the title wraps to two lines
  height: 3rem

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

.nav-link.disabled
  cursor: not-allowed
  color: #555

.title-container
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
  color: #888

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
  // XXX: We use 1px here for flex-basis, otherwise in Firefox and Chrome the
  // whole page will scroll instead of just this container.  See also:
  //   https://stackoverflow.com/a/52489012
  flex: 1 1 1px
  flex-direction: column
  overflow: auto
  padding: 0 1rem
  background-color: #3c3c3c

.section-title
  font-size: 1.7em
  font-weight: 700
  margin-top: 2rem
  margin-bottom: 1.2rem

.row-container
  margin-top: 2rem
  margin-bottom: 3rem

</style>
