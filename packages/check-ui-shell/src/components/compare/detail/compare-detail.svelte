<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher, onMount } from 'svelte'

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
    .scroll-content
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

.section-title
  font-size: 1.7em
  font-weight: 700
  margin-top: 2.5rem
  margin-bottom: 1.5rem
  padding: 0 1rem

.row-container
  display: flex
  flex-direction: row
  margin-top: .5rem
  margin-bottom: 4rem
  margin-left: 1rem
  margin-right: 1rem

.row-container:first-child
  margin-top: 3rem

.separator
  width: 100%
  min-height: 1px
  margin: 2rem 0 5rem 0
  background-color: #888

</style>
