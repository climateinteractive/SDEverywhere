// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  InputVar,
  OutputVar,
  CheckDataset,
  CheckDataRef,
  CheckPredicateOp,
  CheckPredicateOpRef,
  CheckPredicateReport,
  CheckPredicateSpec,
  CheckPredicateTimeSpec,
  CheckScenario,
  InputPosition,
  InputSetting,
  ScenarioSpec
} from '@sdeverywhere/check-core'

import type { ListItemViewModel } from '../../list/list-item-vm.svelte'
import type {
  PredicateItemConfig,
  PredicateRefConfig,
  PredicateScenarioConfig,
  PredicateTimeConfig,
  PredicateType,
  ScenarioInputPosition
} from './check-editor-types'

/**
 * View model for managing predicate configurations in the check editor.
 */
export class CheckPredicateEditorViewModel {
  /** The list of predicates. */
  public predicates = $state<PredicateItemConfig[]>([])

  /** The currently selected predicate ID. */
  public selectedPredicateId = $state<string | undefined>(undefined)

  /** List items for output variable selectors. */
  public readonly datasetListItems: ListItemViewModel[]

  /** List items for input variable selectors. */
  public readonly inputListItems: ListItemViewModel[]

  private nextPredicateId = 1

  /**
   * Create a new predicate editor view model.
   *
   * @param inputVars The list of input variables available in the model.
   * @param outputVars The list of output variables available in the model.
   */
  constructor(
    public readonly inputVars: InputVar[],
    public readonly outputVars: OutputVar[]
  ) {
    this.datasetListItems = this.outputVars.map(outputVar => ({
      id: outputVar.datasetKey,
      label: outputVar.varName
    }))

    this.inputListItems = this.inputVars.map(inputVar => ({
      id: inputVar.varId,
      label: inputVar.varName
    }))
  }

  /**
   * Clear all predicate state.
   */
  clear(): void {
    this.predicates = []
    this.selectedPredicateId = undefined
    this.nextPredicateId = 1
  }

  /**
   * Add a new predicate with default settings.
   */
  addPredicate(): void {
    const newPredicate: PredicateItemConfig = {
      id: `predicate-${this.nextPredicateId++}`,
      type: 'gt',
      ref: {
        kind: 'constant',
        value: 0
      }
    }
    this.predicates.push(newPredicate)
    // Auto-select the first predicate if none is selected
    if (!this.selectedPredicateId) {
      this.selectedPredicateId = newPredicate.id
    }
  }

  /**
   * Add a predicate from a spec.
   *
   * @param spec The predicate spec to convert.
   */
  addPredicateFromSpec(spec: CheckPredicateSpec): void {
    const predicateTypes: PredicateType[] = ['gt', 'gte', 'lt', 'lte', 'eq', 'approx']
    let type: PredicateType = 'gt'
    let refSpec: number | { dataset: unknown; scenario?: unknown } | undefined

    // Find which predicate type is specified
    for (const t of predicateTypes) {
      if (spec[t] !== undefined) {
        type = t
        refSpec = spec[t]
        break
      }
    }

    const newPredicate: PredicateItemConfig = {
      id: `predicate-${this.nextPredicateId++}`,
      type,
      ref: { kind: 'constant', value: 0 }
    }

    // Convert the reference
    if (typeof refSpec === 'number') {
      newPredicate.ref = { kind: 'constant', value: refSpec }
    } else if (refSpec && typeof refSpec === 'object') {
      // Data reference
      newPredicate.ref = { kind: 'data' }
      const dataRef = refSpec as { dataset: unknown; scenario?: unknown }

      // Dataset reference
      if (dataRef.dataset === 'inherit') {
        newPredicate.ref.datasetRefKind = 'inherit'
      } else if (dataRef.dataset && typeof dataRef.dataset === 'object') {
        const datasetSpec = dataRef.dataset as { name: string }
        newPredicate.ref.datasetRefKind = 'name'
        const outputVar = this.outputVars.find(v => v.varName === datasetSpec.name)
        if (outputVar) {
          newPredicate.ref.datasetKey = outputVar.datasetKey
        }
      }

      // Scenario reference
      if (dataRef.scenario === 'inherit') {
        newPredicate.ref.scenarioRefKind = 'inherit'
      } else if (dataRef.scenario && typeof dataRef.scenario === 'object') {
        newPredicate.ref.scenarioRefKind = 'different'
        const scenarioSpec = dataRef.scenario as {
          input?: string
          inputs?: string
          at?: 'default' | 'min' | 'max' | number
        }
        if (scenarioSpec.input) {
          newPredicate.ref.scenarioConfig = {
            kind: 'given-inputs',
            inputs: [
              {
                inputVarId: this.findInputVarId(scenarioSpec.input),
                position: this.convertPosition(scenarioSpec.at)
              }
            ]
          }
        } else if (scenarioSpec.inputs === 'all') {
          newPredicate.ref.scenarioConfig = {
            kind: 'all-inputs',
            position: this.convertPosition(scenarioSpec.at)
          }
        }
      }
    }

    // Tolerance
    if (spec.tolerance !== undefined) {
      newPredicate.tolerance = spec.tolerance
    }

    // Time
    if (spec.time !== undefined) {
      if (typeof spec.time === 'number') {
        // Single time point (CheckPredicateTimeSingle)
        newPredicate.time = { enabled: true, startYear: spec.time }
      } else if (Array.isArray(spec.time)) {
        // Time range as tuple (CheckPredicateTimeRange)
        newPredicate.time = { enabled: true, startYear: spec.time[0], endYear: spec.time[1] }
      } else if (typeof spec.time === 'object') {
        // Time options object (CheckPredicateTimeOptions)
        const timeOptions = spec.time
        const timeConfig: PredicateTimeConfig = { enabled: true }

        // Handle start time (after_incl or after_excl)
        if (timeOptions.after_incl !== undefined) {
          timeConfig.startYear = timeOptions.after_incl
          timeConfig.startType = 'incl'
        } else if (timeOptions.after_excl !== undefined) {
          timeConfig.startYear = timeOptions.after_excl
          timeConfig.startType = 'excl'
        }

        // Handle end time (before_incl or before_excl)
        if (timeOptions.before_incl !== undefined) {
          timeConfig.endYear = timeOptions.before_incl
          timeConfig.endType = 'incl'
        } else if (timeOptions.before_excl !== undefined) {
          timeConfig.endYear = timeOptions.before_excl
          timeConfig.endType = 'excl'
        }

        newPredicate.time = timeConfig
      }
    }

    this.predicates.push(newPredicate)
  }

  /**
   * Select a predicate by ID.
   *
   * @param id The predicate ID to select.
   */
  selectPredicate(id: string): void {
    this.selectedPredicateId = id
  }

  /**
   * Remove a predicate by ID.
   *
   * @param id The predicate ID to remove.
   */
  removePredicate(id: string): void {
    const index = this.predicates.findIndex(p => p.id === id)
    if (index !== -1) {
      this.predicates.splice(index, 1)
      // If we removed the selected predicate, select another one
      if (this.selectedPredicateId === id && this.predicates.length > 0) {
        // Select the previous item, or the first item if we removed the first
        const newIndex = Math.max(0, index - 1)
        this.selectedPredicateId = this.predicates[newIndex].id
      }
    }
  }

  /**
   * Update a predicate's configuration.
   *
   * @param id The predicate ID to update.
   * @param updates The updates to apply.
   */
  updatePredicate(id: string, updates: Partial<PredicateItemConfig>): void {
    const index = this.predicates.findIndex(p => p.id === id)
    if (index !== -1) {
      // Replace the predicate object to trigger reactivity
      this.predicates[index] = { ...this.predicates[index], ...updates }
    }
  }

  /**
   * Create a check predicate report from a predicate item config.
   *
   * @param config The predicate item configuration.
   * @param currentDataset The current dataset being tested (for data reference inherit mode).
   * @param currentScenario The current scenario (for data reference inherit mode).
   * @returns The check predicate report.
   */
  createPredicateReport(
    config: PredicateItemConfig,
    currentDataset?: CheckDataset,
    currentScenario?: CheckScenario
  ): CheckPredicateReport {
    // Create the opRefs map with the appropriate predicate operator
    const opRefs: Map<CheckPredicateOp, CheckPredicateOpRef> = new Map()

    // Create the appropriate reference based on the config
    let opRef: CheckPredicateOpRef
    if (config.ref.kind === 'constant') {
      opRef = {
        kind: 'constant',
        value: config.ref.value || 0
      }
    } else {
      // For data references, create a CheckPredicateOpDataRef
      const dataRef = this.createDataRef(config.ref, currentDataset, currentScenario)
      if (dataRef) {
        opRef = {
          kind: 'data',
          dataRef
        }
      } else {
        // Fallback to constant if data ref couldn't be created
        opRef = {
          kind: 'constant',
          value: 0
        }
      }
    }

    // Map our PredicateType to CheckPredicateOp
    const predicateOp = config.type as CheckPredicateOp
    opRefs.set(predicateOp, opRef)

    // Convert time configuration
    const time = this.convertTimeConfig(config.time)

    // Create the predicate report
    return {
      checkKey: 0, // Placeholder key for editor preview
      result: { status: 'passed' }, // Placeholder result
      opRefs,
      opValues: [],
      tolerance: config.tolerance,
      time
    }
  }

  /**
   * Convert a position from spec format to our format.
   *
   * @param at The position from the spec.
   * @returns The position in our format.
   */
  convertPosition(at: 'default' | 'min' | 'max' | number | undefined): ScenarioInputPosition {
    if (at === undefined || at === 'default') {
      return 'at-default'
    }
    if (at === 'min') {
      return 'at-minimum'
    }
    if (at === 'max') {
      return 'at-maximum'
    }
    // For numeric values, we would use 'at-value' but need to also set customValue;
    // this is handled specially in the caller
    return 'at-value'
  }

  /**
   * Find an input variable ID by name.
   *
   * @param name The variable name.
   * @returns The variable ID, or empty string if not found.
   */
  findInputVarId(name: string): string {
    const inputVar = this.inputVars.find(v => v.varName === name)
    return inputVar?.varId || ''
  }

  /**
   * Convert a ScenarioInputPosition to an InputPosition for the check-core API.
   * Custom values ('at-value') are converted to 'at-default' for preview purposes.
   *
   * @param position The scenario input position.
   * @returns The InputPosition for check-core.
   */
  private toInputPosition(position: ScenarioInputPosition): InputPosition {
    if (position === 'at-value') {
      return 'at-default'
    }
    return position
  }

  /**
   * Convert an InputPosition to a short key for use in UIDs.
   *
   * @param position The input position.
   * @returns The key string.
   */
  private positionKey(position: InputPosition): string {
    switch (position) {
      case 'at-default':
        return 'default'
      case 'at-minimum':
        return 'min'
      case 'at-maximum':
        return 'max'
    }
  }

  /**
   * Create a check scenario from a predicate scenario config.
   *
   * @param config The predicate scenario configuration.
   * @returns The check scenario.
   */
  private createScenarioFromConfig(config: PredicateScenarioConfig): CheckScenario {
    if (config.kind === 'all-inputs') {
      const position = this.toInputPosition(config.position || 'at-default')
      return {
        spec: {
          kind: 'all-inputs',
          uid: `all_inputs_at_${this.positionKey(position)}`,
          position
        },
        inputDescs: []
      }
    } else if (config.kind === 'given-inputs' && config.inputs && config.inputs.length > 0) {
      // Create InputSettings for each input
      const settings: InputSetting[] = config.inputs.map(input => {
        if (input.position === 'at-value' && input.customValue !== undefined) {
          return {
            kind: 'value' as const,
            inputVarId: input.inputVarId,
            value: input.customValue
          }
        } else {
          const position = this.toInputPosition(input.position)
          return {
            kind: 'position' as const,
            inputVarId: input.inputVarId,
            position
          }
        }
      })

      // Create the UID from all settings
      const uidParts = settings.map(setting => {
        if (setting.kind === 'position') {
          return `${setting.inputVarId}_at_${this.positionKey(setting.position)}`
        } else {
          return `${setting.inputVarId}_at_${setting.value}`
        }
      })
      const uid = `inputs_${uidParts.sort().join('_')}`

      const spec: ScenarioSpec = {
        kind: 'input-settings',
        uid,
        settings
      }

      return {
        spec,
        inputDescs: []
      }
    } else {
      // Default to all-inputs
      return {
        spec: {
          kind: 'all-inputs',
          uid: 'all_inputs_at_default',
          position: 'at-default'
        },
        inputDescs: []
      }
    }
  }

  /**
   * Create a default check scenario (all inputs at default position).
   *
   * @returns The default check scenario.
   */
  private createDefaultScenario(): CheckScenario {
    return {
      spec: {
        kind: 'all-inputs',
        uid: 'all-inputs-at-default',
        position: 'at-default'
      },
      inputDescs: []
    }
  }

  /**
   * Convert a PredicateTimeConfig to a CheckPredicateTimeSpec.
   *
   * @param timeConfig The predicate time configuration.
   * @returns The CheckPredicateTimeSpec, or undefined if time is disabled.
   */
  private convertTimeConfig(timeConfig?: PredicateTimeConfig): CheckPredicateTimeSpec | undefined {
    if (!timeConfig || !timeConfig.enabled) {
      return undefined
    }

    // Build the CheckPredicateTimeOptions object based on the time config
    const timeOptions: {
      after_excl?: number
      after_incl?: number
      before_excl?: number
      before_incl?: number
    } = {}

    if (timeConfig.startYear !== undefined) {
      if (timeConfig.startType === 'excl') {
        timeOptions.after_excl = timeConfig.startYear
      } else {
        timeOptions.after_incl = timeConfig.startYear
      }
    }

    if (timeConfig.endYear !== undefined) {
      if (timeConfig.endType === 'excl') {
        timeOptions.before_excl = timeConfig.endYear
      } else {
        timeOptions.before_incl = timeConfig.endYear
      }
    }

    // Only return if at least one time option was set
    if (Object.keys(timeOptions).length === 0) {
      return undefined
    }

    return timeOptions
  }

  /**
   * Create a CheckDataRef from a PredicateRefConfig for data references.
   *
   * @param refConfig The predicate reference configuration.
   * @param currentDataset The current dataset being tested (for inherit mode).
   * @param currentScenario The current scenario (for inherit mode).
   * @returns The CheckDataRef or undefined if the reference is not valid.
   */
  private createDataRef(
    refConfig: PredicateRefConfig,
    currentDataset: CheckDataset | undefined,
    currentScenario: CheckScenario | undefined
  ): CheckDataRef | undefined {
    // Determine the dataset to reference
    let dataset: CheckDataset
    if (refConfig.datasetRefKind === 'inherit') {
      // Use the same dataset that's being tested
      if (!currentDataset) {
        return undefined
      }
      dataset = currentDataset
    } else {
      // Use the specified dataset key
      if (!refConfig.datasetKey) {
        return undefined
      }
      dataset = {
        datasetKey: refConfig.datasetKey,
        name: refConfig.datasetKey
      }
    }

    // Determine the scenario to reference
    let scenario: CheckScenario
    if (refConfig.scenarioRefKind === 'inherit' && currentScenario) {
      // Use the same scenario
      scenario = currentScenario
    } else if (refConfig.scenarioRefKind === 'different' && refConfig.scenarioConfig) {
      // Create a scenario from the inline config
      scenario = this.createScenarioFromConfig(refConfig.scenarioConfig)
    } else if (currentScenario) {
      // Default to current scenario
      scenario = currentScenario
    } else {
      // Fallback to default scenario
      scenario = this.createDefaultScenario()
    }

    return {
      key: scenario.spec ? `${scenario.spec.uid}::${dataset.datasetKey}` : undefined,
      dataset,
      scenario
    }
  }
}
