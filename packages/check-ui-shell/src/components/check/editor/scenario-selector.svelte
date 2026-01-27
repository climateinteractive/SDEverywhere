<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Selector from '../../list/selector.svelte'
import { SelectorOptionViewModel, SelectorViewModel } from '../../list/selector-vm.svelte'
import TypeaheadSelector from '../../list/typeahead-selector.svelte'

import type { CheckEditorViewModel, ScenarioKind, ScenarioItemConfig, ScenarioInputPosition } from './check-editor-vm.svelte'
import type { ListItemViewModel } from '../../list/list-item-vm.svelte'

interface Props {
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { viewModel }: Props = $props()

// State for context menu
let showContextMenu = $state(false)
let contextMenuRef = $state<HTMLDivElement | null>(null)

// Create selector options for position (for all-inputs scenarios, no at-value)
const allInputsPositionOptions = [
  new SelectorOptionViewModel('Default', 'at-default'),
  new SelectorOptionViewModel('Minimum', 'at-minimum'),
  new SelectorOptionViewModel('Maximum', 'at-maximum')
]

// Create selector options for position (for given-inputs scenarios, includes at-value)
const givenInputsPositionOptions = [
  new SelectorOptionViewModel('Default', 'at-default'),
  new SelectorOptionViewModel('Minimum', 'at-minimum'),
  new SelectorOptionViewModel('Maximum', 'at-maximum'),
  new SelectorOptionViewModel('Value', 'at-value')
]

function createPositionSelector(scenario: ScenarioItemConfig) {
  const selector = new SelectorViewModel(allInputsPositionOptions, scenario.position || 'at-default')
  selector.onUserChange = (newValue: string) => {
    viewModel.updateScenario(scenario.id, { position: newValue as ScenarioInputPosition })
  }
  return selector
}

function createInputPositionSelector(scenario: ScenarioItemConfig, inputIndex: number) {
  const input = scenario.inputs?.[inputIndex]
  const selector = new SelectorViewModel(givenInputsPositionOptions, input?.position || 'at-default')
  selector.onUserChange = (newValue: string) => {
    const newPosition = newValue as ScenarioInputPosition
    if (newPosition === 'at-value') {
      // When switching to 'at-value', set the default value for that input
      const inputVar = viewModel.inputVars.find(v => v.varId === input?.inputVarId)
      const defaultValue = inputVar?.defaultValue ?? 0
      viewModel.updateScenarioInput(scenario.id, inputIndex, {
        position: newPosition,
        customValue: defaultValue
      })
    } else {
      viewModel.updateScenarioInput(scenario.id, inputIndex, { position: newPosition })
    }
  }
  return selector
}

/**
 * Get the InputVar for a given input configuration.
 *
 * @param inputVarId The input variable ID.
 * @returns The InputVar, or undefined if not found.
 */
function getInputVar(inputVarId: string) {
  return viewModel.inputVars.find(v => v.varId === inputVarId)
}

/**
 * Check if a custom value is outside the declared range for an input.
 *
 * @param inputVarId The input variable ID.
 * @param value The custom value.
 * @returns True if the value is outside the range.
 */
function isValueOutOfRange(inputVarId: string, value: number): boolean {
  const inputVar = getInputVar(inputVarId)
  if (!inputVar) return false
  return value < inputVar.minValue || value > inputVar.maxValue
}

/**
 * Get a tooltip message for an out-of-range value.
 *
 * @param inputVarId The input variable ID.
 * @returns The tooltip message.
 */
function getOutOfRangeTooltip(inputVarId: string): string {
  const inputVar = getInputVar(inputVarId)
  if (!inputVar) return ''
  return `Value is outside the declared range for this input variable (min=${inputVar.minValue}, max=${inputVar.maxValue})`
}

function handleAddButtonClick() {
  showContextMenu = !showContextMenu
}

function handleAddScenario(kind: ScenarioKind) {
  viewModel.addScenario(kind)
  showContextMenu = false
}

function handleRemoveScenario(id: string) {
  viewModel.removeScenario(id)
}

function handleSelectScenario(id: string) {
  viewModel.selectScenario(id)
}

function handleAddInput(scenarioId: string) {
  viewModel.addInputToScenario(scenarioId)
}

function handleRemoveInput(scenarioId: string, inputIndex: number) {
  viewModel.removeInputFromScenario(scenarioId, inputIndex)
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const currentIndex = viewModel.scenarios.findIndex(s => s.id === viewModel.selectedScenarioId)
    if (currentIndex < viewModel.scenarios.length - 1) {
      viewModel.selectScenario(viewModel.scenarios[currentIndex + 1].id)
    } else {
      viewModel.selectScenario(viewModel.scenarios[0].id)
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const currentIndex = viewModel.scenarios.findIndex(s => s.id === viewModel.selectedScenarioId)
    if (currentIndex > 0) {
      viewModel.selectScenario(viewModel.scenarios[currentIndex - 1].id)
    } else {
      viewModel.selectScenario(viewModel.scenarios[viewModel.scenarios.length - 1].id)
    }
  }
}

// Close context menu when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (contextMenuRef && !contextMenuRef.contains(event.target as Node)) {
    showContextMenu = false
  }
}

$effect(() => {
  if (showContextMenu) {
    // Add a small delay before attaching the click outside listener
    // to prevent the initial button click from immediately closing the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }
})
</script>

<!-- TEMPLATE -->
<div class="scenario-selector-section">
  <div class="scenario-selector-header">
    <h3 class="scenario-selector-title">Scenarios</h3>
    <div class="scenario-selector-add-container">
      <button
        class="scenario-selector-add-btn"
        onclick={handleAddButtonClick}
        aria-label="Add scenario"
      >
        +
      </button>
      {#if showContextMenu}
        <div class="scenario-selector-context-menu" bind:this={contextMenuRef}>
          <button
            class="scenario-selector-context-item"
            onclick={() => handleAddScenario('all-inputs')}
          >
            All inputs at...
          </button>
          <button
            class="scenario-selector-context-item"
            onclick={() => handleAddScenario('given-inputs')}
          >
            Given inputs at...
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="scenario-selector-items" tabindex="0" onkeydown={handleKeyDown} role="list">
    {#each viewModel.scenarios as scenario (scenario.id)}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="scenario-selector-item"
        class:selected={viewModel.selectedScenarioId === scenario.id}
        onclick={() => handleSelectScenario(scenario.id)}
        role="listitem"
      >
        <div class="scenario-selector-item-content">
          {#if scenario.kind === 'all-inputs'}
            <div class="scenario-selector-row">
              <span class="scenario-selector-text">All inputs at</span>
              <Selector viewModel={createPositionSelector(scenario)} ariaLabel="Position" />
              {#if viewModel.scenarios.length > 1}
                <button
                  class="scenario-selector-remove-btn"
                  onclick={e => {
                    e.stopPropagation()
                    handleRemoveScenario(scenario.id)
                  }}
                  aria-label="Remove scenario"
                >
                  ✕
                </button>
              {/if}
            </div>
          {:else if scenario.kind === 'given-inputs'}
            <div class="scenario-selector-given-inputs">
              <div class="scenario-selector-given-header">
                <span class="scenario-selector-text">Given inputs:</span>
                {#if viewModel.scenarios.length > 1}
                  <button
                    class="scenario-selector-remove-btn"
                    onclick={e => {
                      e.stopPropagation()
                      handleRemoveScenario(scenario.id)
                    }}
                    aria-label="Remove scenario"
                  >
                    ✕
                  </button>
                {/if}
              </div>
              {#each scenario.inputs || [] as input, inputIndex (inputIndex)}
                <div class="scenario-selector-row">
                  <div
                    class="scenario-selector-typeahead-wrapper"
                    onclick={e => e.stopPropagation()}
                    role="none"
                  >
                    <TypeaheadSelector
                      items={viewModel.inputListItems}
                      selectedId={input.inputVarId}
                      placeholder="Search inputs..."
                      ariaLabel="Input variable"
                      onSelect={(item: ListItemViewModel) => {
                        viewModel.updateScenarioInput(scenario.id, inputIndex, {
                          inputVarId: item.id
                        })
                      }}
                    />
                  </div>
                  <span class="scenario-selector-text">at</span>
                  <Selector
                    viewModel={createInputPositionSelector(scenario, inputIndex)}
                    ariaLabel="Position"
                  />
                  {#if input.position === 'at-value'}
                    <div class="scenario-selector-value-container">
                      <input
                        class="scenario-selector-value-input"
                        type="text"
                        inputmode="numeric"
                        value={input.customValue ?? getInputVar(input.inputVarId)?.defaultValue ?? 0}
                        oninput={e => {
                          e.stopPropagation()
                          const strValue = (e.target as HTMLInputElement).value
                          const value = parseFloat(strValue)
                          if (!isNaN(value)) {
                            viewModel.updateScenarioInput(scenario.id, inputIndex, { customValue: value })
                          }
                        }}
                        onclick={e => e.stopPropagation()}
                        aria-label="Custom value"
                      />
                      {#if isValueOutOfRange(input.inputVarId, input.customValue ?? 0)}
                        <span
                          class="scenario-selector-warning-badge"
                          title={getOutOfRangeTooltip(input.inputVarId)}
                        >
                          ⚠
                        </span>
                      {/if}
                    </div>
                  {/if}
                  {#if (scenario.inputs?.length || 0) > 1}
                    <button
                      class="scenario-selector-remove-input-btn"
                      onclick={e => {
                        e.stopPropagation()
                        handleRemoveInput(scenario.id, inputIndex)
                      }}
                      aria-label="Remove input"
                    >
                      ✕
                    </button>
                  {/if}
                </div>
              {/each}
              <button
                class="scenario-selector-add-input-btn"
                onclick={e => {
                  e.stopPropagation()
                  handleAddInput(scenario.id)
                }}
              >
                + Add Input
              </button>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.scenario-selector-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
}

.scenario-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.scenario-selector-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
}

.scenario-selector-add-container {
  position: relative;
}

.scenario-selector-add-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--button-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;

  &:hover {
    background-color: var(--button-bg-hover);
  }
}

.scenario-selector-context-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background-color: var(--panel-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 180px;
}

.scenario-selector-context-item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  text-align: left;
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background-color: var(--button-bg-hover);
  }

  &:first-child {
    border-radius: 4px 4px 0 0;
  }

  &:last-child {
    border-radius: 0 0 4px 4px;
  }
}

.scenario-selector-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  max-height: 200px;
  padding-right: 4px;

  &:focus {
    outline: 2px solid var(--border-color-focused);
    outline-offset: -2px;
  }
}

.scenario-selector-item {
  padding: 0.5rem;
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  background-color: var(--panel-bg);
  cursor: pointer;

  &:hover {
    background-color: rgba(200, 220, 240, 0.1);
  }

  &.selected {
    background-color: rgba(100, 180, 255, 0.15);
    border-color: rgba(100, 180, 255, 0.3);
  }
}

.scenario-selector-item-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scenario-selector-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.scenario-selector-given-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scenario-selector-given-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scenario-selector-text {
  font-size: 0.9rem;
  color: var(--text-color-primary);
  white-space: nowrap;
}

.scenario-selector-typeahead-wrapper {
  flex: 1;
  min-width: 0;
}

.scenario-selector-remove-btn,
.scenario-selector-remove-input-btn {
  padding: 0.15rem 0.4rem;
  background: none;
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.85rem;
  flex-shrink: 0;

  &:hover {
    background-color: var(--button-bg-hover);
  }
}

.scenario-selector-add-input-btn {
  padding: 0.35rem 0.5rem;
  background-color: var(--button-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.85rem;
  align-self: flex-start;

  &:hover {
    background-color: var(--button-bg-hover);
  }
}

.scenario-selector-value-container {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.scenario-selector-value-input {
  width: 70px;
  padding: 0.35rem 0.5rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: 0.85rem;
  flex-shrink: 0;

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}

.scenario-selector-warning-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: rgba(255, 180, 0, 0.2);
  color: #f0a000;
  font-size: 0.75rem;
  cursor: help;
  flex-shrink: 0;
}
</style>
