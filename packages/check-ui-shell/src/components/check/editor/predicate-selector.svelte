<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Selector from '../../list/selector.svelte'
import { SelectorOptionViewModel, SelectorViewModel } from '../../list/selector-vm.svelte'

import TypeaheadSelector from '../../list/typeahead-selector.svelte'
import type { ListItemViewModel } from '../../list/list-item-vm.svelte'

import type {
  CheckEditorViewModel,
  PredicateType,
  PredicateRefKind,
  PredicateDatasetRefKind,
  PredicateScenarioRefKind,
  PredicateItemConfig,
  PredicateTimeConfig,
  TimeBoundType,
  PredicateScenarioConfig,
  ScenarioKind,
  ScenarioInputPosition,
  GivenInputConfig
} from './check-editor-vm.svelte'

interface Props {
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { viewModel }: Props = $props()

// Create selector options for predicate type
const predicateTypeOptions = [
  new SelectorOptionViewModel('>', 'gt'),
  new SelectorOptionViewModel('≥', 'gte'),
  new SelectorOptionViewModel('<', 'lt'),
  new SelectorOptionViewModel('≤', 'lte'),
  new SelectorOptionViewModel('=', 'eq'),
  new SelectorOptionViewModel('~', 'approx')
]

// Create selector options for reference kind
const refKindOptions = [new SelectorOptionViewModel('Value', 'constant'), new SelectorOptionViewModel('Data', 'data')]

// Create selector options for dataset reference kind
const datasetRefKindOptions = [
  new SelectorOptionViewModel('Same dataset', 'inherit'),
  new SelectorOptionViewModel('Different dataset', 'name')
]

// Create selector options for scenario reference kind
const scenarioRefKindOptions = [
  new SelectorOptionViewModel('Same scenario', 'inherit'),
  new SelectorOptionViewModel('Different scenario', 'different')
]

// Create selector options for scenario kind (in predicate)
const predicateScenarioKindOptions = [
  new SelectorOptionViewModel('All inputs at...', 'all-inputs'),
  new SelectorOptionViewModel('Given inputs at...', 'given-inputs')
]

// Create selector options for position (for all-inputs scenarios in predicate)
const predicateAllInputsPositionOptions = [
  new SelectorOptionViewModel('Default', 'at-default'),
  new SelectorOptionViewModel('Minimum', 'at-minimum'),
  new SelectorOptionViewModel('Maximum', 'at-maximum')
]

// Create selector options for position (for given-inputs in predicate)
const predicateGivenInputsPositionOptions = [
  new SelectorOptionViewModel('Default', 'at-default'),
  new SelectorOptionViewModel('Minimum', 'at-minimum'),
  new SelectorOptionViewModel('Maximum', 'at-maximum'),
  new SelectorOptionViewModel('Value', 'at-value')
]

// Create selector options for time bound type (inclusive/exclusive)
const startTimeBoundOptions = [new SelectorOptionViewModel('>=', 'incl'), new SelectorOptionViewModel('>', 'excl')]

const endTimeBoundOptions = [new SelectorOptionViewModel('<=', 'incl'), new SelectorOptionViewModel('<', 'excl')]

function createTypeSelector(predicate: PredicateItemConfig) {
  const selector = new SelectorViewModel(predicateTypeOptions, predicate.type)
  selector.onUserChange = (newValue: string) => {
    viewModel.updatePredicate(predicate.id, { type: newValue as PredicateType })
  }
  return selector
}

function createRefKindSelector(predicate: PredicateItemConfig) {
  const selector = new SelectorViewModel(refKindOptions, predicate.ref.kind)
  selector.onUserChange = (newValue: string) => {
    const newKind = newValue as PredicateRefKind
    if (newKind === 'data') {
      // When switching to data, set default ref kinds
      const ref = {
        ...predicate.ref,
        kind: newKind,
        datasetRefKind: 'inherit' as PredicateDatasetRefKind,
        scenarioRefKind: 'different' as PredicateScenarioRefKind
      }
      viewModel.updatePredicate(predicate.id, { ref })
    } else {
      const ref = { ...predicate.ref, kind: newKind }
      viewModel.updatePredicate(predicate.id, { ref })
    }
  }
  return selector
}

function createDatasetRefKindSelector(predicate: PredicateItemConfig) {
  const selector = new SelectorViewModel(datasetRefKindOptions, predicate.ref.datasetRefKind || 'inherit')
  selector.onUserChange = (newValue: string) => {
    const ref = { ...predicate.ref, datasetRefKind: newValue as PredicateDatasetRefKind }
    viewModel.updatePredicate(predicate.id, { ref })
  }
  return selector
}

function createScenarioRefKindSelector(predicate: PredicateItemConfig) {
  const selector = new SelectorViewModel(scenarioRefKindOptions, predicate.ref.scenarioRefKind || 'inherit')
  selector.onUserChange = (newValue: string) => {
    const scenarioRefKind = newValue as PredicateScenarioRefKind
    if (scenarioRefKind === 'different' && !predicate.ref.scenarioConfig) {
      // Initialize with default scenario config
      const ref = {
        ...predicate.ref,
        scenarioRefKind,
        scenarioConfig: { kind: 'all-inputs' as ScenarioKind, position: 'at-default' as ScenarioInputPosition }
      }
      viewModel.updatePredicate(predicate.id, { ref })
    } else {
      const ref = { ...predicate.ref, scenarioRefKind }
      viewModel.updatePredicate(predicate.id, { ref })
    }
  }
  return selector
}

function handleAddPredicate() {
  viewModel.addPredicate()
}

function handleRemovePredicate(id: string) {
  viewModel.removePredicate(id)
}

function handleSelectPredicate(id: string) {
  viewModel.selectPredicate(id)
}

function updateRefValue(predicate: PredicateItemConfig, value: number) {
  const ref = { ...predicate.ref, value }
  viewModel.updatePredicate(predicate.id, { ref })
}

function updateRefDatasetKey(predicate: PredicateItemConfig, datasetKey: string) {
  const ref = { ...predicate.ref, datasetKey }
  viewModel.updatePredicate(predicate.id, { ref })
}

function updateRefScenarioConfig(predicate: PredicateItemConfig, scenarioConfig: PredicateScenarioConfig) {
  const ref = { ...predicate.ref, scenarioConfig }
  viewModel.updatePredicate(predicate.id, { ref })
}

function getOrCreateScenarioConfig(predicate: PredicateItemConfig): PredicateScenarioConfig {
  return (
    predicate.ref.scenarioConfig || {
      kind: 'all-inputs',
      position: 'at-default'
    }
  )
}

function createPredicateScenarioKindSelector(predicate: PredicateItemConfig) {
  const config = getOrCreateScenarioConfig(predicate)
  const selector = new SelectorViewModel(predicateScenarioKindOptions, config.kind)
  selector.onUserChange = (newValue: string) => {
    const kind = newValue as ScenarioKind
    if (kind === 'all-inputs') {
      updateRefScenarioConfig(predicate, { kind, position: 'at-default' })
    } else {
      // Initialize given-inputs with first input variable
      const firstInput = viewModel.inputVars[0]
      updateRefScenarioConfig(predicate, {
        kind,
        inputs: [
          {
            inputVarId: firstInput?.varId || '',
            position: 'at-default'
          }
        ]
      })
    }
  }
  return selector
}

function createPredicateScenarioPositionSelector(predicate: PredicateItemConfig) {
  const config = getOrCreateScenarioConfig(predicate)
  const selector = new SelectorViewModel(predicateAllInputsPositionOptions, config.position || 'at-default')
  selector.onUserChange = (newValue: string) => {
    const position = newValue as ScenarioInputPosition
    updateRefScenarioConfig(predicate, { ...config, position })
  }
  return selector
}

function createPredicateInputPositionSelector(predicate: PredicateItemConfig, inputIndex: number) {
  const config = getOrCreateScenarioConfig(predicate)
  const input = config.inputs?.[inputIndex]
  const selector = new SelectorViewModel(predicateGivenInputsPositionOptions, input?.position || 'at-default')
  selector.onUserChange = (newValue: string) => {
    const newPosition = newValue as ScenarioInputPosition
    const inputs = [...(config.inputs || [])]
    if (newPosition === 'at-value') {
      const inputVar = viewModel.inputVars.find(v => v.varId === inputs[inputIndex]?.inputVarId)
      inputs[inputIndex] = { ...inputs[inputIndex], position: newPosition, customValue: inputVar?.defaultValue ?? 0 }
    } else {
      inputs[inputIndex] = { ...inputs[inputIndex], position: newPosition }
    }
    updateRefScenarioConfig(predicate, { ...config, inputs })
  }
  return selector
}

function updatePredicateScenarioInput(
  predicate: PredicateItemConfig,
  inputIndex: number,
  updates: Partial<GivenInputConfig>
) {
  const config = getOrCreateScenarioConfig(predicate)
  const inputs = [...(config.inputs || [])]
  inputs[inputIndex] = { ...inputs[inputIndex], ...updates }
  updateRefScenarioConfig(predicate, { ...config, inputs })
}

function getPredicateInputVar(inputVarId: string) {
  return viewModel.inputVars.find(v => v.varId === inputVarId)
}

function isPredicateValueOutOfRange(inputVarId: string, value: number): boolean {
  const inputVar = getPredicateInputVar(inputVarId)
  if (!inputVar) return false
  return value < inputVar.minValue || value > inputVar.maxValue
}

function getPredicateOutOfRangeTooltip(inputVarId: string): string {
  const inputVar = getPredicateInputVar(inputVarId)
  if (!inputVar) return ''
  return `Value is outside the declared range for this input variable (min=${inputVar.minValue}, max=${inputVar.maxValue})`
}

function updateTimeConfig(predicate: PredicateItemConfig, updates: Partial<PredicateTimeConfig>) {
  const time = { ...predicate.time, ...updates } as PredicateTimeConfig
  viewModel.updatePredicate(predicate.id, { time })
}

function createStartTimeBoundSelector(predicate: PredicateItemConfig) {
  const selector = new SelectorViewModel(startTimeBoundOptions, predicate.time?.startType || 'incl')
  selector.onUserChange = (newValue: string) => {
    updateTimeConfig(predicate, { startType: newValue as TimeBoundType })
  }
  return selector
}

function createEndTimeBoundSelector(predicate: PredicateItemConfig) {
  const selector = new SelectorViewModel(endTimeBoundOptions, predicate.time?.endType || 'incl')
  selector.onUserChange = (newValue: string) => {
    updateTimeConfig(predicate, { endType: newValue as TimeBoundType })
  }
  return selector
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const currentIndex = viewModel.predicates.findIndex(p => p.id === viewModel.selectedPredicateId)
    if (currentIndex < viewModel.predicates.length - 1) {
      viewModel.selectPredicate(viewModel.predicates[currentIndex + 1].id)
    } else {
      viewModel.selectPredicate(viewModel.predicates[0].id)
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const currentIndex = viewModel.predicates.findIndex(p => p.id === viewModel.selectedPredicateId)
    if (currentIndex > 0) {
      viewModel.selectPredicate(viewModel.predicates[currentIndex - 1].id)
    } else {
      viewModel.selectPredicate(viewModel.predicates[viewModel.predicates.length - 1].id)
    }
  }
}
</script>

<!-- TEMPLATE -->
<div class="predicate-selector-section">
  <div class="predicate-selector-header">
    <h3 class="predicate-selector-title">
      Predicates
      <button class="predicate-selector-add-btn" onclick={handleAddPredicate} aria-label="Add predicate"> + </button>
    </h3>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="predicate-selector-items" tabindex="0" onkeydown={handleKeyDown} role="list">
    {#each viewModel.predicates as predicate (predicate.id)}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="predicate-selector-item"
        class:selected={viewModel.selectedPredicateId === predicate.id}
        onclick={() => handleSelectPredicate(predicate.id)}
        role="listitem"
      >
        <div class="predicate-selector-content">
          <div class="predicate-selector-row">
            <span class="predicate-selector-text predicate-selector-fixed-width-label">Expect:</span>
            <Selector viewModel={createTypeSelector(predicate)} ariaLabel="Predicate type" />
            <Selector viewModel={createRefKindSelector(predicate)} ariaLabel="Reference kind" />

            {#if predicate.ref.kind === 'constant'}
              <input
                id="pred-value-{predicate.id}"
                class="predicate-selector-input"
                type="number"
                value={predicate.ref.value ?? 0}
                oninput={e => {
                  e.stopPropagation()
                  updateRefValue(predicate, parseFloat((e.target as HTMLInputElement).value))
                }}
                onclick={e => e.stopPropagation()}
                aria-label="Predicate value"
              />
            {/if}

            {#if viewModel.predicates.length > 1}
              <div class="spacer-flex"></div>
              <button
                class="predicate-selector-remove-btn"
                onclick={e => {
                  e.stopPropagation()
                  handleRemovePredicate(predicate.id)
                }}
                aria-label="Remove predicate"
              >
                ✕
              </button>
            {/if}
          </div>

          {#if predicate.ref.kind === 'data'}
            <div class="predicate-selector-row">
              <span class="predicate-selector-text predicate-selector-fixed-width-label">Dataset:</span>
              <Selector viewModel={createDatasetRefKindSelector(predicate)} ariaLabel="Dataset reference kind" />
              {#if predicate.ref.datasetRefKind === 'name'}
                <div class="predicate-selector-typeahead-wrapper" onclick={e => e.stopPropagation()} role="none">
                  <TypeaheadSelector
                    items={viewModel.datasetListItems}
                    selectedId={predicate.ref.datasetKey || ''}
                    placeholder="Search outputs..."
                    ariaLabel="Reference dataset"
                    onSelect={(item: ListItemViewModel) => {
                      updateRefDatasetKey(predicate, item.id)
                    }}
                  />
                </div>
              {/if}
            </div>
            <div class="predicate-selector-row">
              <span class="predicate-selector-text predicate-selector-fixed-width-label">Scenario:</span>
              <Selector viewModel={createScenarioRefKindSelector(predicate)} ariaLabel="Scenario reference kind" />
            </div>
            {#if predicate.ref.scenarioRefKind === 'different'}
              <div class="predicate-selector-scenario-editor">
                <div class="predicate-selector-row">
                  <Selector viewModel={createPredicateScenarioKindSelector(predicate)} ariaLabel="Scenario kind" />
                  {#if getOrCreateScenarioConfig(predicate).kind === 'all-inputs'}
                    <span class="predicate-selector-text">at</span>
                    <Selector viewModel={createPredicateScenarioPositionSelector(predicate)} ariaLabel="Position" />
                  {/if}
                </div>
                {#if getOrCreateScenarioConfig(predicate).kind === 'given-inputs'}
                  {#each getOrCreateScenarioConfig(predicate).inputs || [] as input, inputIndex (inputIndex)}
                    <div class="predicate-selector-row">
                      <div class="predicate-selector-typeahead-wrapper" onclick={e => e.stopPropagation()} role="none">
                        <TypeaheadSelector
                          items={viewModel.inputListItems}
                          selectedId={input.inputVarId}
                          placeholder="Search inputs..."
                          ariaLabel="Input variable"
                          onSelect={(item: ListItemViewModel) => {
                            updatePredicateScenarioInput(predicate, inputIndex, { inputVarId: item.id })
                          }}
                        />
                      </div>
                      <span class="predicate-selector-text">at</span>
                      <Selector
                        viewModel={createPredicateInputPositionSelector(predicate, inputIndex)}
                        ariaLabel="Position"
                      />
                      {#if input.position === 'at-value'}
                        <div class="predicate-selector-value-container">
                          <input
                            class="predicate-selector-input predicate-selector-value-input"
                            type="text"
                            inputmode="numeric"
                            value={input.customValue ?? getPredicateInputVar(input.inputVarId)?.defaultValue ?? 0}
                            oninput={e => {
                              e.stopPropagation()
                              const strValue = (e.target as HTMLInputElement).value
                              const value = parseFloat(strValue)
                              if (!isNaN(value)) {
                                updatePredicateScenarioInput(predicate, inputIndex, { customValue: value })
                              }
                            }}
                            onclick={e => e.stopPropagation()}
                            aria-label="Custom value"
                          />
                          {#if isPredicateValueOutOfRange(input.inputVarId, input.customValue ?? 0)}
                            <span
                              class="predicate-selector-warning-badge"
                              title={getPredicateOutOfRangeTooltip(input.inputVarId)}
                            >
                              ⚠
                            </span>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/each}
                {/if}
              </div>
            {/if}
          {/if}

          {#if predicate.type === 'approx'}
            <div class="predicate-selector-row">
              <span class="predicate-selector-text">Tolerance:</span>
              <input
                class="predicate-selector-input"
                type="number"
                value={predicate.tolerance ?? 0.1}
                oninput={e => {
                  e.stopPropagation()
                  viewModel.updatePredicate(predicate.id, {
                    tolerance: parseFloat((e.target as HTMLInputElement).value)
                  })
                }}
                onclick={e => e.stopPropagation()}
                step="0.01"
                aria-label="Predicate tolerance"
              />
            </div>
          {/if}

          <div class="predicate-selector-row">
            <label class="predicate-selector-checkbox-label">
              <input
                type="checkbox"
                checked={predicate.time?.enabled ?? false}
                onchange={e => {
                  e.stopPropagation()
                  updateTimeConfig(predicate, { enabled: (e.target as HTMLInputElement).checked })
                }}
                onclick={e => e.stopPropagation()}
              />
              Time range
            </label>
            {#if predicate.time?.enabled}
              <Selector viewModel={createStartTimeBoundSelector(predicate)} ariaLabel="Start bound type" />
              <input
                class="predicate-selector-input predicate-selector-year-input"
                type="text"
                inputmode="numeric"
                placeholder="Start"
                value={predicate.time?.startYear ?? ''}
                oninput={e => {
                  e.stopPropagation()
                  const val = (e.target as HTMLInputElement).value
                  const year = val ? parseInt(val, 10) : undefined
                  if (val === '' || !isNaN(year!)) {
                    updateTimeConfig(predicate, { startYear: year })
                  }
                }}
                onclick={e => e.stopPropagation()}
                aria-label="Start year"
              />
              <span class="predicate-selector-text">to</span>
              <Selector viewModel={createEndTimeBoundSelector(predicate)} ariaLabel="End bound type" />
              <input
                class="predicate-selector-input predicate-selector-year-input"
                type="text"
                inputmode="numeric"
                placeholder="End"
                value={predicate.time?.endYear ?? ''}
                oninput={e => {
                  e.stopPropagation()
                  const val = (e.target as HTMLInputElement).value
                  const year = val ? parseInt(val, 10) : undefined
                  if (val === '' || !isNaN(year!)) {
                    updateTimeConfig(predicate, { endYear: year })
                  }
                }}
                onclick={e => e.stopPropagation()}
                aria-label="End year"
              />
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.predicate-selector-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spacer-flex {
  flex: 1;
}

.predicate-selector-header {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.predicate-selector-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.predicate-selector-add-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  margin-left: 4px;
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

.predicate-selector-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  // &:focus {
  //   outline: 2px solid var(--border-color-focused);
  //   outline-offset: -2px;
  // }
}

.predicate-selector-item {
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

.predicate-selector-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.predicate-selector-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.predicate-selector-text {
  font-size: 0.9rem;
  color: var(--text-color-primary);
  white-space: nowrap;
}

.predicate-selector-fixed-width-label {
  width: 46px;
}

.predicate-selector-input {
  padding: 4px 8px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: 0.85rem;
  width: 80px;
  flex-shrink: 0;

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}

.predicate-selector-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.85rem;
  flex-shrink: 0;
  line-height: 1;

  &:hover {
    background-color: var(--button-bg-hover);
  }

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}

.predicate-selector-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--text-color-primary);
  cursor: pointer;
  white-space: nowrap;
}

.predicate-selector-year-input {
  width: 60px;
}

.predicate-selector-scenario-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: rgba(100, 150, 200, 0.05);
  border-radius: 4px;
  margin-top: 0.25rem;
}

.predicate-selector-typeahead-wrapper {
  flex: 1;
  min-width: 0;
}

.predicate-selector-value-container {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.predicate-selector-value-input {
  width: 70px;
}

.predicate-selector-warning-badge {
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
