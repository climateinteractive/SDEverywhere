<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { createEventDispatcher } from 'svelte'

import type { ComparisonScenario } from '@sdeverywhere/check-core'

import type { ContextMenuItem } from '../../_shared/context-menu.svelte'
import ContextMenu from '../../_shared/context-menu.svelte'

import ComparisonSummarySection from './comparison-summary-section.svelte'
import type { ComparisonSummaryViewModel } from './comparison-summary-vm'

export let viewModel: ComparisonSummaryViewModel

let contextMenuSourceScenario: ComparisonScenario | undefined
let contextMenuItems: ContextMenuItem[] = []
let contextMenuEvent: MouseEvent

const dispatch = createEventDispatcher()

function onShowContextMenu(e: CustomEvent) {
  const eventSourceKind = e.detail?.kind
  switch (eventSourceKind) {
    case 'scenario': {
      contextMenuSourceScenario = e.detail.scenario
      contextMenuItems = [
        {
          key: 'show-trace-view',
          displayText: 'Open Scenario in Trace View'
        }
      ]
      contextMenuEvent = e.detail.clickEvent
      break
    }
    default:
      contextMenuSourceScenario = undefined
      contextMenuItems = []
      contextMenuEvent = undefined
      break
  }
}

function onHideContextMenu() {
  contextMenuEvent = undefined
}

function onContextMenuItemSelected(e: CustomEvent) {
  // Hide the context menu
  contextMenuEvent = undefined

  // Handle the command
  const cmd = e.detail
  switch (cmd) {
    case 'show-trace-view': {
      // For now, use the `ScenarioSpec` associated with the "right" model; if it's
      // not valid, the trace view will select another scenario by default
      dispatch('command', {
        cmd: 'show-trace-view-with-scenario',
        scenarioSpec: contextMenuSourceScenario?.specR,
        scenarioKind: 'comparison'
      })
      break
    }
    default:
      console.error(`ERROR: Unhandled context menu command '${cmd}'`)
      break
  }
}
</script>

<!-- TEMPLATE -->
<div class="comparison-summary-container">
  {#each viewModel.sections as section}
    <div class="section-container" id={section.header.rowKey}>
      <ComparisonSummarySection viewModel={section} on:command on:show-context-menu={onShowContextMenu} />
    </div>
  {/each}
  <div class="footer"></div>
  <ContextMenu
    items={contextMenuItems}
    initialEvent={contextMenuEvent}
    on:item-selected={onContextMenuItemSelected}
    on:clickout={onHideContextMenu}
  />
</div>

<!-- STYLE -->
<style lang="scss">
.comparison-summary-container {
  display: flex;
  flex-direction: column;
  padding-top: 2rem;
}

.section-container {
  display: flex;
  flex-direction: column;
  // Set scroll margin to account for headers when jumping to anchors
  scroll-margin-top: 5rem;

  &:not(:last-child) {
    margin-bottom: 1.5rem;
  }
}

.footer {
  flex: 0 0 1rem;
}
</style>
