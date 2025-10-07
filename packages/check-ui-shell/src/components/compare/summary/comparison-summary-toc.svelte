<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { ComparisonSummarySectionViewModel } from './comparison-summary-section-vm'

export let sections: ComparisonSummarySectionViewModel[]

// Only show sections that have differences
$: visibleSections = sections.filter(section => section.rowsWithDiffs > 0)
</script>

<!-- TEMPLATE -->
<div class="toc-container">
  <div class="toc-title">Groups with differences</div>
  <div class="toc-entries">
    {#if visibleSections.length > 0}
      {#each visibleSections as section}
        <a class="toc-entry" href="#{section.header.rowKey}">
          <span class="title">{@html section.header.title}</span>
          <span class="row-count">{section.rows.length}</span>
        </a>
      {/each}
    {:else}
      <div class="toc-all-clear">No differences detected</div>
    {/if}
  </div>
</div>

<!-- STYLE -->
<style lang="sass">

.toc-container
  position: relative
  width: fit-content
  min-width: 13rem
  // TODO: This value depends on the one in the row component
  // margin-left: 15rem
  margin-top: .4rem
  margin-bottom: 1.2rem
  border: .5px solid #444
  border-radius: .4rem

.toc-title
  position: absolute
  top: -.6rem
  left: .4rem
  font-weight: 700
  padding: 0 .4rem
  background-color: #272727
  color: #999

.toc-all-clear
  color: var(--status-passed)

.toc-entries
  display: flex
  flex-direction: column
  gap: .4rem
  margin-top: .4rem
  padding: .8rem

.toc-entry
  text-decoration: none
  font-weight: 700
  color: #ccc
  &:hover
    color: #fff

.title
  flex: 1

.row-count
  margin-left: .2rem
  padding: .1rem .5rem
  border-radius: 1rem
  background-color: #7f5f25
  color: #eee
  font-size: .85em

</style>
