<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'
import SummaryRow from './compare-summary-row.svelte'
import type { CompareSummaryViewModel } from './compare-summary-vm'

export let viewModel: CompareSummaryViewModel

const viewsSection = viewModel.viewsSection

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include compare-summary.pug

.compare-summary-container
  //- +if('viewsSection.viewGroups.length > 0')
  //-   .section-container
  //-     .section-header All scenario views
  //-     +views-section
  .big-section-header Differences by input scenario
  +section('scenariosOnlyInLeft')
  +section('scenariosOnlyInRight')
  +section('scenariosWithDiffs')
  +section('scenariosWithoutDiffs')
  .big-section-header Differences by output variable
  +section('datasetsAdded')
  +section('datasetsRemoved')
  +section('datasetsWithDiffs')
  +section('datasetsWithoutDiffs')
  .footer

</template>




<!-- STYLE -->
<style lang='sass'>

.compare-summary-container
  display: flex
  flex-direction: column

.section-container
  display: flex
  flex-direction: column
  align-items: flex-start
  margin-top: 1rem
  margin-bottom: 1rem
  &:not(:first-child)
    margin-top: 2rem
  
.section-header
  margin-bottom: .5rem
  font-size: 1.3rem

.big-section-header
  margin-top: 2.5rem
  margin-bottom: 1rem
  font-size: 1.5rem

.group-container
  display: flex
  flex-direction: column
  &:not(:last-child)
    margin-bottom: 1rem

.footer
  flex: 0 0 1rem

</style>
