<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Button from '../../_shared/button.svelte'
import Selector from '../../list/selector.svelte'
import { SelectorOptionViewModel, SelectorViewModel } from '../../list/selector-vm.svelte'

import type { InputPosition } from '@sdeverywhere/check-core'
import type { CheckEditorViewModel, ScenarioKind, ScenarioItemConfig } from './check-editor-vm.svelte'

interface Props {
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { viewModel }: Props = $props()

// Create selector options for scenario kind
const scenarioKindOptions = [
  new SelectorOptionViewModel('All Inputs', 'all-inputs'),
  new SelectorOptionViewModel('Single Input', 'single-input'),
  new SelectorOptionViewModel('Input Group', 'input-group')
]

// Create selector options for position
const positionOptions = [
  new SelectorOptionViewModel('Default', 'at-default'),
  new SelectorOptionViewModel('Minimum', 'at-minimum'),
  new SelectorOptionViewModel('Maximum', 'at-maximum')
]

function createKindSelector(scenario: ScenarioItemConfig) {
  const selector = new SelectorViewModel(scenarioKindOptions, scenario.kind)
  selector.onUserChange = (newValue: string) => {
    viewModel.updateScenario(scenario.id, { kind: newValue as ScenarioKind })
  }
  return selector
}

function createPositionSelector(scenario: ScenarioItemConfig) {
  const selector = new SelectorViewModel(positionOptions, scenario.position || 'at-default')
  selector.onUserChange = (newValue: string) => {
    viewModel.updateScenario(scenario.id, { position: newValue as InputPosition })
  }
  return selector
}

function handleAddScenario() {
  viewModel.addScenario()
}

function handleRemoveScenario(id: string) {
  viewModel.removeScenario(id)
}
</script>

<!-- TEMPLATE -->
<div class="scenario-selector-section">
  <div class="scenario-selector-header">
    <h3 class="scenario-selector-title">Scenarios</h3>
    <Button onClick={handleAddScenario}>Add Scenario</Button>
  </div>

  {#each viewModel.scenarios as scenario (scenario.id)}
    <div class="scenario-selector-item">
      <div class="scenario-selector-item-header">
        <span class="scenario-selector-item-label">Scenario</span>
        {#if viewModel.scenarios.length > 1}
          <button
            class="scenario-selector-remove-btn"
            onclick={() => handleRemoveScenario(scenario.id)}
            aria-label="Remove scenario"
          >
            ✕
          </button>
        {/if}
      </div>

      <div class="scenario-selector-field">
        <span class="scenario-selector-label">Kind</span>
        <Selector viewModel={createKindSelector(scenario)} ariaLabel="Scenario kind" />
      </div>

      {#if scenario.kind === 'all-inputs'}
        <div class="scenario-selector-field">
          <span class="scenario-selector-label">Position</span>
          <Selector viewModel={createPositionSelector(scenario)} ariaLabel="Position" />
        </div>
      {:else if scenario.kind === 'single-input'}
        <div class="scenario-selector-field">
          <label for="input-var-{scenario.id}" class="scenario-selector-label">Input Variable</label>
          <select
            id="input-var-{scenario.id}"
            class="scenario-selector-select"
            value={scenario.inputVarId || ''}
            onchange={e => viewModel.updateScenario(scenario.id, { inputVarId: (e.target as HTMLSelectElement).value })}
            aria-label="Input variable"
          >
            <option value="">Select input...</option>
            {#each viewModel.inputListItems as item}
              <option value={item.id}>{item.label}</option>
            {/each}
          </select>
        </div>
        <div class="scenario-selector-field">
          <span class="scenario-selector-label">Position</span>
          <Selector viewModel={createPositionSelector(scenario)} ariaLabel="Position" />
        </div>
      {:else if scenario.kind === 'input-group'}
        <div class="scenario-selector-field">
          <label for="group-name-{scenario.id}" class="scenario-selector-label">Input Group Name</label>
          <input
            id="group-name-{scenario.id}"
            type="text"
            class="scenario-selector-input"
            value={scenario.inputGroupName || ''}
            oninput={e => viewModel.updateScenario(scenario.id, { inputGroupName: (e.target as HTMLInputElement).value })}
            placeholder="Enter group name..."
            aria-label="Input group name"
          />
        </div>
      {/if}
    </div>
  {/each}
</div>

<!-- STYLE -->
<style lang="scss">
.scenario-selector-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.scenario-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-color-normal);
}

.scenario-selector-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
}

.scenario-selector-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  background-color: var(--panel-bg);
}

.scenario-selector-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scenario-selector-item-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color-primary);
}

.scenario-selector-remove-btn {
  padding: 0.25rem 0.5rem;
  background: none;
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background-color: var(--button-bg-hover);
  }
}

.scenario-selector-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scenario-selector-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color-primary);
}

.scenario-selector-input,
.scenario-selector-select {
  padding: 0.5rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: inherit;

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}
</style>
