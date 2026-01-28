<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { InputPosition, CheckScenarioInputDesc } from '@sdeverywhere/check-core'
import { predicateMessage } from '@sdeverywhere/check-core'
import CheckSummaryGraphBox from '../summary/check-summary-graph-box.svelte'

import type { CheckSummaryGraphBoxViewModel } from '../summary/check-summary-graph-box-vm'

interface Props {
  /** The view model for the graph box. */
  viewModel: CheckSummaryGraphBoxViewModel | undefined
}

let { viewModel }: Props = $props()

/**
 * Convert a position to a human-readable name.
 */
function positionName(position: InputPosition): string {
  switch (position) {
    case 'at-default':
      return 'default'
    case 'at-minimum':
      return 'minimum'
    case 'at-maximum':
      return 'maximum'
    default:
      return position
  }
}

/**
 * Generate a message for a single input description.
 */
function inputMessage(inputDesc: CheckScenarioInputDesc): string {
  let msg = inputDesc.name
  if (inputDesc.position) {
    msg += ` is at ${positionName(inputDesc.position)}`
    if (inputDesc.value !== undefined) {
      msg += ` (${inputDesc.value})`
    }
  } else if (inputDesc.value !== undefined) {
    msg += ` is ${inputDesc.value}`
  }
  return msg
}

// Generate the scenario message for display
const scenarioMessageText = $derived.by(() => {
  if (!viewModel) {
    return ''
  }
  const checkScenario = viewModel.scenario
  if (checkScenario.spec === undefined) {
    return 'error: unknown scenario'
  }

  if (checkScenario.spec.kind === 'all-inputs') {
    const position = checkScenario.spec.position
    return `when all inputs are at ${positionName(position)}`
  } else if (checkScenario.inputDescs.length > 0) {
    const inputMessages = checkScenario.inputDescs.map(inputMessage).join(' and ')
    return `when ${inputMessages}`
  } else {
    return 'when inputs are configured'
  }
})

// Generate the predicate message for display
const predicateMessageText = $derived.by(() => {
  if (!viewModel) {
    return ''
  }
  // Use a no-op styling function since we don't use HTML styling
  const noStyle = (s: string) => s
  return predicateMessage(viewModel.predicateReport, noStyle)
})

// Combine into full message
const fullMessageText = $derived.by(() => {
  if (!viewModel) {
    return ''
  }
  const datasetName = viewModel.datasetKey
  return `${scenarioMessageText}, then ${datasetName} ${predicateMessageText}`
})
</script>

<!-- TEMPLATE -->
<div class="preview-graph-container">
  {#if viewModel}
    <div class="preview-graph-header">
      <span class="preview-graph-status preview-graph-status-passed">✓</span>
      <span class="preview-graph-label">{fullMessageText}</span>
    </div>
    <div class="preview-graph-wrapper">
      <CheckSummaryGraphBox {viewModel} />
    </div>
  {:else}
    <div class="preview-graph-placeholder">
      Select a dataset and predicate to see preview
    </div>
  {/if}
</div>

<!-- STYLE -->
<style lang="scss">
.preview-graph-container {
  flex: 1;
  min-width: 0;
  min-height: 340px;
  display: flex;
  flex-direction: column;
  background-color: var(--panel-bg);
  padding: 1rem;
  overflow-x: hidden;
  overflow-y: auto;
}

.preview-graph-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color-normal);
  flex-shrink: 0;
}

.preview-graph-status {
  font-weight: bold;
  font-size: 1rem;
  width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
}

.preview-graph-status-passed {
  color: var(--status-color-passed, #4caf50);
}

.preview-graph-label {
  font-size: 0.9rem;
  color: var(--text-color-primary);
  line-height: 1.4;
}

.preview-graph-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-graph-placeholder {
  color: var(--text-color-secondary);
  font-style: italic;
  text-align: center;
  padding: 2rem;
}
</style>
