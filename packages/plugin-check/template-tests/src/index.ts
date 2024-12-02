// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type {
  Bundle,
  ComparisonOptions,
  ComparisonScenarioSpec,
  ComparisonSpecs,
  ComparisonSpecsSource,
  ConfigInitOptions,
  ConfigOptions,
  DatasetKey,
  InputId,
  InputVar
} from '@sdeverywhere/check-core'

// Load the yaml files containing model check test definitions.  The
// `./__YAML_*_GLOB_PATTERNS__` part will be replaced by Vite (see
// `vite-config-for-tests.ts`).  Note that we provide a placeholder here
// that looks like a valid glob pattern, since Vite's dependency resolver
// will report errors if it is invalid (not a literal).
const yamlCheckSpecFilesGlob = import.meta.glob('./__YAML_CHECK_GLOB_PATTERNS__', {
  eager: true,
  query: '?raw',
  import: 'default'
})
const yamlCheckSpecFiles: string[] = []
for (const yamlKey of Object.keys(yamlCheckSpecFilesGlob)) {
  const yaml = yamlCheckSpecFilesGlob[yamlKey]
  yamlCheckSpecFiles.push(yaml as unknown as string)
}

// Load the yaml files containing model comparison test definitions
const yamlComparisonFilesGlob = import.meta.glob('./__YAML_COMPARISON_GLOB_PATTERNS__', {
  eager: true,
  query: '?raw',
  import: 'default'
})
const yamlComparisonSpecFiles: ComparisonSpecsSource[] = Object.entries(yamlComparisonFilesGlob).map(entry => {
  return {
    kind: 'yaml',
    filename: entry[0],
    content: entry[1] as string
  }
})

// If an output variable is renamed, define the mapping from the old key
// to the new key here.  If this step is omitted, the old variable will
// appear as being removed and the new variable will appear as being added,
// which will prevent them from being compared.
// TODO: Inject this from sde.config.ts file
const renamedDatasetKeys: Map<DatasetKey, DatasetKey> = new Map([
  // ['Model_old_name', 'Model_new_name']
])

// TODO: Make this pluggable (with default implementation similar to below)
export async function getConfigOptions(
  bundleL: Bundle | undefined,
  bundleR: Bundle,
  opts?: ConfigInitOptions
): Promise<ConfigOptions> {
  // Only include comparison options if the baseline bundle is defined (and
  // has the same version)
  let comparisonOptions: ComparisonOptions
  if (bundleL && bundleL.version === bundleR.version) {
    // Configure the set of input scenarios used for comparisons.  This includes
    // the default matrix of scenarios; for any output variable, the model will
    // be run:
    //   - once with all inputs at their default
    //   - twice for each input
    //       - once with single input at its minimum
    //       - once with single input at its maximum
    const baseComparisonSpecs = createBaseComparisonSpecs(bundleL, bundleR)

    // Also include custom scenarios defined in the `comparisons/*.yaml` files
    const comparisonSpecs = [baseComparisonSpecs, ...yamlComparisonSpecFiles]

    comparisonOptions = {
      baseline: {
        name: opts?.bundleNameL || 'baseline',
        bundle: bundleL
      },
      thresholds: [1, 5, 10],
      specs: comparisonSpecs,
      datasets: {
        renamedDatasetKeys
      }
    }
  }

  return {
    current: {
      name: opts?.bundleNameR || 'current',
      bundle: bundleR
    },
    check: {
      tests: yamlCheckSpecFiles
    },
    comparison: comparisonOptions
  }
}

function createBaseComparisonSpecs(bundleL: Bundle, bundleR: Bundle): ComparisonSpecs {
  // Get the union of all input IDs appearing in left and/or right
  const allInputIds: Set<InputId> = new Set()
  const addInputs = (bundle: Bundle, inputsMap: Map<InputId, InputVar>) => {
    for (const inputVar of bundle.modelSpec.inputVars.values()) {
      allInputIds.add(inputVar.inputId)
      inputsMap.set(inputVar.inputId, inputVar)
    }
  }
  const inputsByIdL: Map<InputId, InputVar> = new Map()
  const inputsByIdR: Map<InputId, InputVar> = new Map()
  addInputs(bundleL, inputsByIdL)
  addInputs(bundleR, inputsByIdR)

  // Create an "all inputs at default" scenario
  const scenarios: ComparisonScenarioSpec[] = []
  scenarios.push({
    kind: 'scenario-with-all-inputs',
    id: 'all_inputs_at_default',
    title: 'All inputs',
    subtitle: 'at default',
    position: 'default'
  })

  // Create "input at min/max" scenarios for all inputs (that appear in either "left" or "right")
  const addScenario = (inputId: InputId, position: 'min' | 'max') => {
    const inputL = inputsByIdL.get(inputId)
    const inputR = inputsByIdR.get(inputId)
    if (inputL === undefined || inputR === undefined) {
      return
    }

    // Don't add a scenario if the input's min or max is equal to its default (this is already
    // covered by the `all_inputs_at_default` scenario from above)
    if (position === 'min') {
      if (inputL.minValue === inputL.defaultValue && inputR.minValue === inputR.defaultValue) {
        return
      }
    } else {
      if (inputL.maxValue === inputL.defaultValue && inputR.maxValue === inputR.defaultValue) {
        return
      }
    }

    // Derive the scenario name from the related slider name (or if not defined, the variable name)
    const input = inputR || inputL
    const path = input.relatedItem?.locationPath
    const title = path ? path[path.length - 1] : input.varName

    scenarios.push({
      kind: 'scenario-with-inputs',
      id: `id_${inputId}_at_${position}`,
      title,
      subtitle: `at ${position}`,
      inputs: [
        {
          kind: 'input-at-position',
          inputName: `id ${inputId}`,
          position
        }
      ]
    })
  }

  // Add an "at min" and "at max" scenario for each input
  const inputIds = [...allInputIds]
  for (const inputId of inputIds) {
    addScenario(inputId, 'min')
    addScenario(inputId, 'max')
  }

  return {
    scenarios,
    scenarioGroups: [],
    viewGroups: []
  }
}
