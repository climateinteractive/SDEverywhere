<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { CheckSummaryViewModel } from './check-summary-vm'
import CheckSummaryTest from './check-summary-test.svelte'

export let viewModel: CheckSummaryViewModel

// Previously we allowed for collapsing the whole checks section, but now that we have
// tabs, that is less useful, so always show them
// let showCheckDetail = viewModel.total > 0 && viewModel.total !== viewModel.passed
const showCheckDetail = true
</script>

<!-- TEMPLATE -->
<div class="check-summary-container">
  <div class="summary-bar-row">
    <div class="bar-container">
      {#if viewModel.total > 0}
        <div class="bar bucket-bg-0" style="width: {viewModel.percents[0]}%;"></div>
        <div class="bar status-bg-failed" style="width: {viewModel.percents[1]}%;"></div>
        <div class="bar status-bg-error" style="width: {viewModel.percents[2]}%;"></div>
      {:else}
        <div class="bar gray" style="width: 100%"></div>
      {/if}
    </div>
    <span class="summary-label">
      {#if viewModel.total === 0}
        <span>No checks</span>
      {:else if viewModel.total === viewModel.passed}
        <span>{viewModel.total} total passed</span>
      {:else}
        <span>{viewModel.total} total</span>
        {#if viewModel.passed}
          <span class="sep">&nbsp;|&nbsp;</span>
          <span class="status-color-passed">{viewModel.passed} passed</span>
        {/if}
        {#if viewModel.failed}
          <span class="sep">&nbsp;|&nbsp;</span>
          <span class="status-color-failed">{viewModel.failed} failed</span>
        {/if}
        {#if viewModel.errors}
          <span class="sep">&nbsp;|&nbsp;</span>
          {#if viewModel.errors > 1}
            <span class="status-color-error">{viewModel.errors} errors</span>
          {:else}
            <span class="status-color-error">{viewModel.errors} error</span>
          {/if}
        {/if}
      {/if}
    </span>
  </div>
  {#if showCheckDetail}
    <div class="check-detail">
      {#each viewModel.groups as group}
        <div class="group-container">
          <div class="row group">
            <div class="label">{group.name}</div>
          </div>
          {#each group.tests as testViewModel}
            <CheckSummaryTest viewModel={testViewModel} />
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- STYLE -->
<style lang="scss">
$indent: 1rem;

.check-summary-container {
  display: flex;
  flex-direction: column;
}

.check-detail {
  display: flex;
  flex-direction: column;
}

.group-container {
  margin-bottom: 1.2rem;

  :global(.test-rows) {
    display: flex;
    flex-direction: column;
  }

  :global(.test-rows:not(.children-visible)) {
    display: none;
  }

  :global(.test-rows.children-visible) {
    display: flex;
  }

  :global(.row) {
    display: flex;
    flex-direction: row;
  }

  :global(.row.group) {
    font-size: 1.2em;
  }

  :global(.row.test) {
    margin-top: 0.4rem;
  }

  :global(.row.test > .label) {
    cursor: pointer;
  }

  :global(.row.scenario) {
    color: #777;
  }

  :global(.row.dataset) {
    color: #777;
  }

  :global(.row.predicate) {
    color: #777;
  }

  :global(.row.predicate > .label) {
    cursor: pointer;
  }

  :global(.bold) {
    font-weight: 700;
    color: #bbb;
  }
}

.summary-bar-row {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  align-self: flex-start;
  margin: 2.6rem 0;
  opacity: 1;
}

.bar-container {
  display: flex;
  flex-direction: row;
  width: 15rem;
  height: 0.8rem;
}

.bar {
  height: 0.8rem;

  &.gray {
    background-color: #777;
  }
}

.summary-label {
  margin-left: 0.8rem;
  color: #fff;
}

.sep {
  color: #777;
}
</style>
