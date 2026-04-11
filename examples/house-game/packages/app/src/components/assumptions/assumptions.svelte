<!-- SCRIPT -->
<script lang="ts">
import type { AssumptionsViewModel } from './assumptions-vm'

export let viewModel: AssumptionsViewModel
</script>

<!-- TEMPLATE -->
<div class="assumptions-title">Assumptions</div>
<div class="assumption-rows">
  {#each viewModel.rows as row (row.label)}
    <div class="assumption-row">
      <div class="assumption-name">{row.label}</div>
      <div class="assumption-value">{@html row.value}</div>
    </div>
  {/each}
</div>

<!-- STYLE -->
<style lang="scss">
.assumptions-title {
  font-weight: 700;
  margin-bottom: 12px;
}

.assumption-rows {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.assumption-row {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: space-between;
  font-size: 14px;
  line-height: 1.4;

  &:nth-child(2) {
    margin-bottom: 12px;
  }
}
</style>
