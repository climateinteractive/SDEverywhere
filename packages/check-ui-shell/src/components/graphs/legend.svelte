<!-- Copyright (c)2020-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import type { BundleGraphSpec } from '@sdeverywhere/check-core'

export let graphSpec: BundleGraphSpec

</script>




<!-- TEMPLATE -->
<div class="legend-container">
  {#each graphSpec.legendItems as item}
    <div class="legend-item" style="background-color: {item.color};">{item.label.toUpperCase()}</div>
  {/each}
</div>




<!-- STYLE -->
<style lang='scss'>

// Use `flex` with a fixed height to accomodate at most two rows of items,
// with a small amount of vertical padding between the rows.  The negative
// top margin allows the legend to slide up to cover excessive space left
// at the bottom of the graph by the chart.js library.
.legend-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  flex: 0 0 3.5rem;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-top: -.45rem;
  font-family: 'Roboto Condensed';
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.2;
}

.legend-item {
  margin: 0 .2rem .1rem .2rem;
  padding: .25rem .6rem .2rem .6rem;
  color: #fff;
  text-align: center;
}

</style>
