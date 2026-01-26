<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { createEventDispatcher } from 'svelte'

import type { CheckScenarioReport } from '@sdeverywhere/check-core'

import type { ContextMenuItem } from '../../_shared/context-menu.svelte'
import ContextMenu from '../../_shared/context-menu.svelte'

import type { CheckSummaryViewModel } from './check-summary-vm'
import type { CheckSummaryRowViewModel, TestInfo } from './check-summary-row-vm'
import CheckSummaryRow from './check-summary-row.svelte'

export let viewModel: CheckSummaryViewModel

let contextMenuSourceScenario: CheckScenarioReport | undefined
let contextMenuSourceTestInfo: TestInfo | undefined
let contextMenuItems: ContextMenuItem[] = []
let contextMenuEvent: MouseEvent | undefined

const dispatch = createEventDispatcher()

function onShowContextMenu(event: MouseEvent, rowViewModel: CheckSummaryRowViewModel) {
  if (rowViewModel.testInfo) {
    // Test row - show edit option
    contextMenuSourceTestInfo = rowViewModel.testInfo
    contextMenuSourceScenario = undefined
    contextMenuItems = [{ key: 'edit-test', displayText: 'Edit Test...' }]
    contextMenuEvent = event
  } else if (rowViewModel.scenarioReport?.checkScenario?.spec) {
    // Scenario row - show trace view option
    contextMenuSourceScenario = rowViewModel.scenarioReport
    contextMenuSourceTestInfo = undefined
    contextMenuItems = [{ key: 'show-trace-view', displayText: 'Open Scenario in Trace View' }]
    contextMenuEvent = event
  } else {
    contextMenuSourceScenario = undefined
    contextMenuSourceTestInfo = undefined
    contextMenuItems = []
    contextMenuEvent = undefined
  }
}

function onHideContextMenu() {
  contextMenuEvent = undefined
}

function onNewTestClick() {
  dispatch('command', {
    cmd: 'new-test'
  })
}

function onContextMenuItemSelected(e: CustomEvent) {
  // Hide the context menu
  contextMenuEvent = undefined

  // Handle the command
  const cmd = e.detail
  switch (cmd) {
    case 'show-trace-view':
      dispatch('command', {
        cmd: 'show-trace-view-with-scenario',
        scenarioSpec: contextMenuSourceScenario?.checkScenario?.spec,
        scenarioKind: 'check'
      })
      break
    case 'edit-test':
      dispatch('command', {
        cmd: 'edit-test',
        testInfo: contextMenuSourceTestInfo
      })
      break
    default:
      console.error(`ERROR: Unhandled context menu command '${cmd}'`)
      break
  }
}
</script>

<!-- TEMPLATE -->
<div class="check-summary-container">
  <div class="summary-bar-row">
    <div class="bar-container">
      {#if viewModel.total > 0}
        <div class="bar bucket-bg-0" style="width: {viewModel.percents[0]}%;"></div>
        <div class="bar status-bg-failed" style="width: {viewModel.percents[1]}%;"></div>
        <div class="bar status-bg-error" style="width: {viewModel.percents[2]}%;"></div>
        <div class="bar status-bg-skipped" style="width: {viewModel.percents[3]}%;"></div>
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
        {#if viewModel.skipped}
          <span class="sep">&nbsp;|&nbsp;</span>
          <span class="status-color-skipped">{viewModel.skipped} skipped</span>
        {/if}
      {/if}
    </span>
    <button class="new-test-btn" on:click={onNewTestClick} aria-label="New test">
      + New Test
    </button>
  </div>
  <div class="check-detail">
    {#each viewModel.groups as group}
      <div class="group-container">
        <div class="row group">
          <div class="label">{group.name}</div>
        </div>
        {#each group.tests as testViewModel}
          <CheckSummaryRow viewModel={testViewModel} {onShowContextMenu} />
        {/each}
      </div>
    {/each}
  </div>
  <ContextMenu
    items={contextMenuItems}
    initialEvent={contextMenuEvent}
    on:item-selected={onContextMenuItemSelected}
    on:clickout={onHideContextMenu}
  />
</div>

<!-- STYLE -->
<style lang="scss">
// XXX: Prevent the sticky test rows from being hidden behind the sticky tab bar
$container-top-offset: 50px;

$group-row-h: 32px;
$test-row-h: 20px;
$other-row-h: 18px;
$bg-color: #272727;

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
    position: sticky;
    top: $container-top-offset;
    height: $group-row-h;
    z-index: 6;
    background-color: $bg-color;
    font-size: 1.2em;
  }

  :global(.row.group > .label) {
    margin-top: 8px;
  }

  :global(.row.test) {
    position: sticky;
    display: flex;
    align-items: center;
    top: $container-top-offset + $group-row-h;
    height: $test-row-h;
    z-index: 5;
    background-color: $bg-color;
  }

  :global(.row.scenario) {
    position: sticky;
    top: $container-top-offset + $group-row-h + $test-row-h;
    height: $other-row-h;
    z-index: 4;
    background-color: $bg-color;
  }

  :global(.row.dataset) {
    position: sticky;
    top: $container-top-offset + $group-row-h + $test-row-h + $other-row-h;
    height: $other-row-h;
    z-index: 3;
    background-color: $bg-color;
  }

  :global(.row.predicate) {
    position: sticky;
    top: $container-top-offset + $group-row-h + $test-row-h + (2 * $other-row-h);
    height: $other-row-h;
    z-index: 2;
    background-color: $bg-color;
  }

  :global(.row.placeholder) {
    height: $other-row-h;
  }

  :global(.row > .label) {
    cursor: pointer;
  }

  :global(.row.scenario),
  :global(.row.dataset),
  :global(.row.predicate) {
    color: #777;
  }

  :global(.bold) {
    font-weight: 700;
    color: #bbb;
  }
}

.summary-bar-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 2.6rem 0;
  gap: 1rem;
  opacity: 1;
}

.new-test-btn {
  margin-left: auto;
  padding: 0.4rem 0.8rem;
  background-color: #3a3a3a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;

  &:hover {
    background-color: #4a4a4a;
  }

  &:focus {
    outline: none;
    border-color: #888;
    box-shadow: 0 0 0 1px #888;
  }
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
