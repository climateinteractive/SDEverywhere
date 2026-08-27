// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

import type { Dataset } from '../_shared/types'
import type { DataPlanner } from '../data/data-planner'
import type { CheckConfig } from './check-config'
import type { CheckResult } from './check-func'
import type { CheckKey, CheckTask } from './check-planner'
import { CheckPlanner } from './check-planner'
import type { CheckPredicateOp } from './check-predicate'
import type { CheckReport } from './check-report'
import { buildCheckReport } from './check-report'
import type { CheckNameSpec, CheckSpec } from './check-spec'
import type { CheckDataRef, CheckDataRefKey, CheckRefDataset } from './check-data-ref'

/**
 * Process all checks from the given spec and add them to the given data planner.
 *
 * @param checkConfig The check configuration.
 * @param checkSpec The check spec that resulted from parsing the tests.
 * @param dataPlanner The planner that will plan out data fetches for the check tests.
 * @param refDataPlanner The planner that will plan out reference data fetches.
 * @param skipChecks The checks to skip.
 * @return A function that will build the check report after the data requests are all processed.
 */
export function runChecks(
  checkConfig: CheckConfig,
  checkSpec: CheckSpec,
  dataPlanner: DataPlanner,
  refDataPlanner: DataPlanner,
  skipChecks: CheckNameSpec[]
): () => CheckReport {
  // Visit all the check test specs and plan the checks that need
  // to be performed
  const modelSpec = checkConfig.bundle.modelSpec
  const checkPlanner = new CheckPlanner(modelSpec)
  checkPlanner.addAllChecks(checkSpec, skipChecks)
  const checkPlan = checkPlanner.buildPlan()

  // Create a map to hold reference datasets; these will be fetched before
  // performing any checks that rely on reference data
  const refDatasets: Map<CheckDataRefKey, Dataset> = new Map()

  // Plan the reference data fetches
  for (const [dataRefKey, ref] of checkPlan.dataRefs.entries()) {
    // Add a request to the ref data planner for each dataset that is referenced
    // by one or more predicates.  These requests will be processed before all
    // other checks so that the reference data is available in memory when the
    // check action is performed.
    refDataPlanner.addRequest(undefined, ref.scenario.spec, ref.dataset.datasetKey, datasets => {
      const dataset = datasets.datasetR
      if (dataset) {
        refDatasets.set(dataRefKey, dataset)
      }
    })
  }

  // Create a map that will hold the result of each check
  const checkResults: Map<CheckKey, CheckResult> = new Map()

  // Plan the checks
  for (const [checkKey, checkTask] of checkPlan.tasks.entries()) {
    // Check if this check should be skipped
    if (checkTask.skip === true) {
      // Create a skipped result immediately
      checkResults.set(checkKey, { status: 'skipped' })
    } else {
      // For each check, add a request to the data planner so that the check
      // runs when the dataset is fetched
      dataPlanner.addRequest(undefined, checkTask.scenario.spec, checkTask.dataset.datasetKey, datasets => {
        // Run the check action on the dataset, then save the result
        const dataset = datasets.datasetR
        const checkResult = runCheck(checkTask, dataset, refDatasets)
        checkResults.set(checkKey, checkResult)
      })
    }
  }

  // Return a function that will build the report with the check results; this
  // should be called only after all data tasks have been processed
  // TODO: This is an unusual approach; should refactor
  return () => {
    return buildCheckReport(checkPlan, checkResults)
  }
}

/**
 * Run a single check on the given dataset.
 *
 * @param checkTask The check action.
 * @param dataset The primary dataset to be checked.
 * @param refDatasets The other datasets referenced by the predicate.
 */
export function runCheck(
  checkTask: CheckTask,
  dataset: Dataset | undefined,
  refDatasets: Map<CheckDataRefKey, Dataset> | undefined
): CheckResult {
  if (dataset === undefined) {
    // Set an error status when the primary dataset is not available;
    // this should not happen in practice because the dataset should have
    // already been resolved in an earlier stage
    return {
      status: 'error',
      message: 'no data available'
    }
  }

  // Associate each op with a ref dataset (if the op references one or more)
  let opRefDatasets: Map<CheckPredicateOp, Dataset>
  if (checkTask.dataRefs) {
    opRefDatasets = new Map()
    for (const [op, dataRef] of checkTask.dataRefs.entries()) {
      // Resolve the data for each referenced dataset
      const resolvedDatasets: Dataset[] = []
      for (const ref of dataRef.refs) {
        const refDataset = refDatasets?.get(ref.key)
        if (refDataset === undefined) {
          // Set an error status when the reference data could not be resolved
          return errorResultForRefDataset(ref)
        }
        resolvedDatasets.push(refDataset)
      }

      // Associate the (possibly combined) dataset with the op
      opRefDatasets.set(op, combineRefDatasets(dataRef, resolvedDatasets))
    }
  }

  // All data was resolved; run the check action on the dataset
  return checkTask.action.run(dataset, opRefDatasets)
}

/**
 * Return an error result that describes why the given referenced dataset could
 * not be resolved.
 *
 * @param ref The referenced dataset that could not be resolved.
 */
function errorResultForRefDataset(ref: CheckRefDataset): CheckResult {
  if (ref.dataset.datasetKey === undefined) {
    // The dataset could not be resolved
    return {
      status: 'error',
      errorInfo: {
        kind: 'unknown-dataset',
        name: ref.dataset.name
      }
    }
  } else if (ref.scenario.spec === undefined) {
    // One or more inputs could not be resolved
    if (ref.scenario.error) {
      return {
        status: 'error',
        errorInfo: {
          kind: ref.scenario.error.kind,
          name: ref.scenario.error.name
        }
      }
    } else {
      let inputName: string
      if (ref.scenario.inputDescs.length > 0) {
        // TODO: Include all unresolved input names here
        inputName = ref.scenario.inputDescs[0].name
      } else {
        inputName = 'unknown'
      }
      return {
        status: 'error',
        errorInfo: {
          kind: 'unknown-input',
          name: inputName
        }
      }
    }
  } else {
    // Something else went wrong; treat this as an internal error
    return {
      status: 'error',
      message: 'unresolved data reference'
    }
  }
}

/**
 * Combine the given resolved datasets into the single dataset that will be used
 * as the reference for a predicate op.
 *
 * @param dataRef The data reference that describes how the datasets are combined.
 * @param datasets The resolved data for each referenced dataset.
 */
function combineRefDatasets(dataRef: CheckDataRef, datasets: Dataset[]): Dataset {
  if (dataRef.op === undefined) {
    // There is a single referenced dataset, so no combining is needed
    return datasets[0]
  }

  switch (dataRef.op) {
    case 'sum':
      return sumDatasets(datasets)
    default:
      assertNever(dataRef.op)
  }
}

/**
 * Return a dataset containing the sum of the values from the given datasets.  Note
 * that a time is only included in the resulting dataset if a value is available at
 * that time in every one of the given datasets.
 *
 * @param datasets The datasets to be summed.
 */
function sumDatasets(datasets: Dataset[]): Dataset {
  const firstDataset = datasets[0]
  const otherDatasets = datasets.slice(1)

  const summed: Dataset = new Map()
  for (const [time, value] of firstDataset) {
    let sum = value
    let complete = true
    for (const otherDataset of otherDatasets) {
      const otherValue = otherDataset.get(time)
      if (otherValue === undefined) {
        complete = false
        break
      }
      sum += otherValue
    }
    if (complete) {
      summed.set(time, sum)
    }
  }

  return summed
}
