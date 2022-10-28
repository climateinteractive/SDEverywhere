<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import type { CompareGraphsViewModel } from './compare-graphs-vm'
import GraphsRow from './compare-graphs-row.svelte'

export let viewModel: CompareGraphsViewModel

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include compare-graphs.pug

.compare-graphs-container
  .header-container
    div All Graphs
  .scroll-container
    +sections

</template>




<!-- STYLE -->
<style lang='sass'>

.compare-graphs-container
  display: flex
  flex-direction: column
  flex: 1

.header-container
  display: flex
  flex-direction: column
  height: 3rem
  // XXX: Use negative margin to make the shadow stretch all the way 
  // across, then use extra padding to compensate
  margin: 0 -1rem
  padding: 0 2rem
  box-shadow: 0 1rem .5rem -.5rem rgba(0,0,0,.5)
  font-size: 2em
  font-weight: 700
  z-index: 1

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
  margin-top: 3rem
  margin-left: 5rem
  font-size: 1.5em
  font-weight: 700

.row-container
  margin-top: 2rem
  margin-bottom: 2rem

</style>
