// Copyright (c) 2025 Climate Interactive / New Venture Fund

import yaml from 'yaml'

import type {
  CheckDataCoordinator,
  CheckDataset,
  CheckGroupSpec,
  CheckTestSpec,
  InputVar,
  OutputVar
} from '@sdeverywhere/check-core'
import type {} from '@sdeverywhere/check-core'

import { CheckSummaryGraphBoxViewModel } from '../summary/check-summary-graph-box-vm'

import type { CheckTestConfig } from './check-editor-types'
import { CheckScenarioEditorViewModel } from './check-scenario-editor-vm.svelte'
import { CheckDatasetEditorViewModel } from './check-dataset-editor-vm.svelte'
import { CheckPredicateEditorViewModel } from './check-predicate-editor-vm.svelte'

/** View model for the check test editor. */
export class CheckEditorViewModel {
  // Test description text fields
  public describeText = $state('Variable or group')
  public testText = $state('should [have behavior] when...')

  // Sub-editors for each section
  public readonly scenarioEditor: CheckScenarioEditorViewModel
  public readonly datasetEditor: CheckDatasetEditorViewModel
  public readonly predicateEditor: CheckPredicateEditorViewModel

  /** Called when the user saves the check test. */
  public onSave?: (config: CheckTestConfig) => void

  /** Called when the user cancels editing. */
  public onCancel?: () => void

  /**
   * Create a new check editor view model.
   *
   * @param dataCoordinator The data coordinator for fetching datasets.
   * @param inputVars The list of input variables available in the model.
   * @param outputVars The list of output variables available in the model.
   */
  constructor(
    private readonly dataCoordinator: CheckDataCoordinator,
    public readonly inputVars: InputVar[],
    public readonly outputVars: OutputVar[]
  ) {
    // Create the view model for each section
    this.scenarioEditor = new CheckScenarioEditorViewModel(inputVars)
    this.datasetEditor = new CheckDatasetEditorViewModel(outputVars)
    this.predicateEditor = new CheckPredicateEditorViewModel(inputVars, outputVars)

    // Initialize with default items
    this.scenarioEditor.addScenario()
    this.datasetEditor.addDataset()
    this.predicateEditor.addPredicate()
  }

  /**
   * Clear all editor state.
   */
  clear(): void {
    this.describeText = 'Variable or group'
    this.testText = 'should [have behavior] when...'
    this.scenarioEditor.clear()
    this.datasetEditor.clear()
    this.predicateEditor.clear()
  }

  /**
   * Initialize the editor from a group spec and test spec.
   *
   * @param groupSpec The group spec containing the describe text.
   * @param testSpec The test spec to load.
   */
  initFromSpec(groupSpec: CheckGroupSpec, testSpec: CheckTestSpec): void {
    this.clear()

    // Set description texts
    this.describeText = groupSpec.describe
    this.testText = testSpec.it

    // Convert scenarios
    if (testSpec.scenarios && testSpec.scenarios.length > 0) {
      for (const scenarioSpec of testSpec.scenarios) {
        this.scenarioEditor.addScenarioFromSpec(scenarioSpec)
      }
    } else {
      // Default to all-inputs at default
      this.scenarioEditor.addScenario('all-inputs')
    }

    // Convert datasets
    if (testSpec.datasets && testSpec.datasets.length > 0) {
      for (const datasetSpec of testSpec.datasets) {
        this.datasetEditor.addDatasetFromSpec(datasetSpec)
      }
    } else {
      this.datasetEditor.addDataset()
    }

    // Convert predicates
    if (testSpec.predicates && testSpec.predicates.length > 0) {
      for (const predicateSpec of testSpec.predicates) {
        this.predicateEditor.addPredicateFromSpec(predicateSpec)
      }
    } else {
      this.predicateEditor.addPredicate()
    }

    // Select first items
    if (this.scenarioEditor.scenarios.length > 0) {
      this.scenarioEditor.selectedScenarioId = this.scenarioEditor.scenarios[0].id
    }
    if (this.datasetEditor.datasets.length > 0) {
      this.datasetEditor.selectedDatasetId = this.datasetEditor.datasets[0].id
    }
    if (this.predicateEditor.predicates.length > 0) {
      this.predicateEditor.selectedPredicateId = this.predicateEditor.predicates[0].id
    }
  }

  /**
   * Parse a YAML string and initialize the editor from it.
   *
   * @param yamlString The YAML string to parse.
   * @returns An error message if parsing failed, or undefined if successful.
   */
  parseYamlAndInit(yamlString: string): string | undefined {
    try {
      const parsed = yaml.parse(yamlString)

      // The YAML should be an array of group specs
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return 'Invalid YAML: expected an array of test groups'
      }

      const groupSpec = parsed[0] as CheckGroupSpec
      if (!groupSpec.describe || !groupSpec.tests || !Array.isArray(groupSpec.tests)) {
        return 'Invalid YAML: group must have "describe" and "tests" properties'
      }

      if (groupSpec.tests.length === 0) {
        return 'Invalid YAML: group must have at least one test'
      }

      const testSpec = groupSpec.tests[0] as CheckTestSpec
      if (!testSpec.it) {
        return 'Invalid YAML: test must have an "it" property'
      }

      // Initialize from the spec
      this.initFromSpec(groupSpec, testSpec)
      return undefined
    } catch (e) {
      return `Failed to parse YAML: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  /**
   * Get the current check test configuration.
   *
   * @returns The current check test configuration.
   */
  getConfig(): CheckTestConfig {
    return {
      scenarios: [...this.scenarioEditor.scenarios],
      datasets: [...this.datasetEditor.datasets],
      predicates: [...this.predicateEditor.predicates]
    }
  }

  /**
   * Generate YAML code for the current check test configuration.
   *
   * @returns The YAML code as a string.
   */
  getYamlCode(): string {
    const lines: string[] = []

    lines.push(`- describe: ${this.describeText}`)
    lines.push('  tests:')
    lines.push(`    - it: ${this.testText}`)

    // Generate scenarios
    lines.push('      scenarios:')
    for (const scenario of this.scenarioEditor.scenarios) {
      if (scenario.kind === 'all-inputs') {
        const position = scenario.position || 'at-default'
        const positionStr = position.replace('at-', '')
        lines.push(`        - with_inputs: all`)
        lines.push(`          at: ${positionStr}`)
      } else if (scenario.kind === 'given-inputs' && scenario.inputs && scenario.inputs.length > 0) {
        for (const input of scenario.inputs) {
          const inputVar = this.inputVars.find(v => v.varId === input.inputVarId)
          if (inputVar) {
            lines.push(`        - with: ${inputVar.varName}`)
            if (input.position === 'at-value') {
              // Output the custom value as a number
              const value = input.customValue ?? inputVar.defaultValue
              lines.push(`          at: ${value}`)
            } else {
              const position = input.position.replace('at-', '')
              lines.push(`          at: ${position}`)
            }
          }
        }
      }
    }

    // Generate datasets
    lines.push('      datasets:')
    for (const dataset of this.datasetEditor.datasets) {
      const outputVar = this.outputVars.find(v => v.datasetKey === dataset.datasetKey)
      if (outputVar) {
        lines.push(`        - name: ${outputVar.varName}`)
      }
    }

    // Generate predicates
    lines.push('      predicates:')
    for (const predicate of this.predicateEditor.predicates) {
      if (predicate.ref.kind === 'constant') {
        lines.push(`        - ${predicate.type}: ${predicate.ref.value ?? 0}`)
      } else {
        // Data reference predicate
        lines.push(`        - ${predicate.type}:`)

        // Dataset reference
        const datasetRefKind = predicate.ref.datasetRefKind || 'inherit'
        if (datasetRefKind === 'inherit') {
          lines.push('            dataset: inherit')
        } else {
          const outputVar = this.outputVars.find(v => v.datasetKey === predicate.ref.datasetKey)
          if (outputVar) {
            lines.push('            dataset:')
            lines.push(`              name: ${outputVar.varName}`)
          }
        }

        // Scenario reference
        const scenarioRefKind = predicate.ref.scenarioRefKind || 'inherit'
        if (scenarioRefKind === 'inherit') {
          lines.push('            scenario: inherit')
        } else if (predicate.ref.scenarioConfig) {
          // Output the inline scenario configuration
          const scenarioConfig = predicate.ref.scenarioConfig
          lines.push('            scenario:')
          if (scenarioConfig.kind === 'all-inputs') {
            const position = scenarioConfig.position || 'at-default'
            const positionStr = position.replace('at-', '')
            lines.push(`              with_inputs: all`)
            lines.push(`              at: ${positionStr}`)
          } else if (
            scenarioConfig.kind === 'given-inputs' &&
            scenarioConfig.inputs &&
            scenarioConfig.inputs.length > 0
          ) {
            const input = scenarioConfig.inputs[0]
            const inputVar = this.inputVars.find(v => v.varId === input.inputVarId)
            if (inputVar) {
              lines.push(`              with: ${inputVar.varName}`)
              if (input.position === 'at-value') {
                const value = input.customValue ?? inputVar.defaultValue
                lines.push(`              at: ${value}`)
              } else {
                const position = input.position.replace('at-', '')
                lines.push(`              at: ${position}`)
              }
            }
          }
        }
      }
      if (predicate.type === 'approx' && predicate.tolerance !== undefined) {
        lines.push(`          tolerance: ${predicate.tolerance}`)
      }
      // Time range
      if (predicate.time?.enabled) {
        const hasStart = predicate.time.startYear !== undefined
        const hasEnd = predicate.time.endYear !== undefined
        const startType = predicate.time.startType || 'incl'
        const endType = predicate.time.endType || 'incl'

        if (hasStart && hasEnd) {
          // Both start and end specified - check if we can use simple array format
          if (startType === 'incl' && endType === 'incl') {
            lines.push(`          time: [${predicate.time.startYear}, ${predicate.time.endYear}]`)
          } else {
            // Use explicit format with after_incl/after_excl and before_incl/before_excl
            const startKey = startType === 'incl' ? 'after_incl' : 'after_excl'
            const endKey = endType === 'incl' ? 'before_incl' : 'before_excl'
            lines.push(`          time:`)
            lines.push(`            ${startKey}: ${predicate.time.startYear}`)
            lines.push(`            ${endKey}: ${predicate.time.endYear}`)
          }
        } else if (hasStart) {
          // Only start specified
          if (startType === 'incl') {
            lines.push(`          time: ${predicate.time.startYear}`)
          } else {
            lines.push(`          time:`)
            lines.push(`            after_excl: ${predicate.time.startYear}`)
          }
        } else if (hasEnd) {
          // Only end specified
          const endKey = endType === 'incl' ? 'before_incl' : 'before_excl'
          lines.push(`          time:`)
          lines.push(`            ${endKey}: ${predicate.time.endYear}`)
        }
      }
    }

    return lines.join('\n')
  }

  /**
   * Create a graph box view model for preview.
   *
   * @returns The check summary graph box view model.
   */
  createGraphBoxViewModel(): CheckSummaryGraphBoxViewModel | undefined {
    const scenarios = this.scenarioEditor.scenarios
    const datasets = this.datasetEditor.datasets
    const predicates = this.predicateEditor.predicates

    // For preview, use the selected scenario, dataset, and predicate
    if (scenarios.length === 0 || datasets.length === 0 || predicates.length === 0) {
      return undefined
    }

    // Find the selected items, or fall back to first items if none selected
    const selectedScenario = scenarios.find(s => s.id === this.scenarioEditor.selectedScenarioId) || scenarios[0]
    const selectedDataset = datasets.find(d => d.id === this.datasetEditor.selectedDatasetId) || datasets[0]
    const selectedPredicate = predicates.find(p => p.id === this.predicateEditor.selectedPredicateId) || predicates[0]

    if (!selectedDataset.datasetKey) {
      return undefined
    }

    // Create a check scenario from the scenario config
    const scenario = this.scenarioEditor.createCheckScenario(selectedScenario)

    // Create a CheckDataset for the current dataset (used for data reference inherit mode)
    const currentDataset: CheckDataset = {
      datasetKey: selectedDataset.datasetKey,
      name: selectedDataset.datasetKey
    }

    // Create a predicate report from the predicate config, passing current dataset and scenario
    // for data reference inherit mode
    const predicateReport = this.predicateEditor.createPredicateReport(selectedPredicate, currentDataset, scenario)

    // Create and return the graph box view model
    return new CheckSummaryGraphBoxViewModel(
      this.dataCoordinator,
      scenario,
      selectedDataset.datasetKey,
      predicateReport
    )
  }
}
