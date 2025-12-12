<!-- SCRIPT -->
<script lang="ts">
import type { GraphSpec } from '@core'
import { _ } from '@shared/strings'

export let graphSpec: GraphSpec
</script>

<!-- TEMPLATE -->
<div class="legend-container">
  {#each graphSpec.legendItems as item}
    <div class="legend-item" style="background-color: {item.color}">
      {@html $_(item.labelKey)}
    </div>
  {/each}
</div>

<!-- STYLE -->
<style lang="sass">
.legend-container
  display: flex
  flex-direction: row
  flex-wrap: wrap
  justify-content: center
  align-items: center
  width: 100%
  margin-top: -8px
  gap: 6px
  font-weight: bold

.legend-item
  padding: 3px 8px 1px 8px
  color: #fff
  text-align: center
  font-size: .8em
</style>
