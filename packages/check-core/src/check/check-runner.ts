// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

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
import type { CheckDataRefKey } from './check-data-ref'

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
  for (const [dataRefKey, dataRef] of checkPlan.dataRefs.entries()) {
    // Add a request to the ref data planner for each dataset that is referenced
    // by one or more predicates.  These requests will be processed before all
    // other checks so that the reference data is available in memory when the
    // check action is performed.
    refDataPlanner.addRequest(undefined, dataRef.scenario.spec, dataRef.dataset.datasetKey, datasets => {
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

  // Associate each op with a ref dataset (if the op references one)
  let opRefDatasets: Map<CheckPredicateOp, Dataset>
  if (checkTask.dataRefs) {
    opRefDatasets = new Map()
    for (const [op, dataRef] of checkTask.dataRefs.entries()) {
      const refDataset = refDatasets?.get(dataRef.key)
      if (refDataset === undefined) {
        // Set an error status when the reference data could not be resolved
        if (dataRef.dataset.datasetKey === undefined) {
          // The dataset could not be resolved
          return {
            status: 'error',
            errorInfo: {
              kind: 'unknown-dataset',
              name: dataRef.dataset.name
            }
          }
        } else if (dataRef.scenario.spec === undefined) {
          // One or more inputs could not be resolved
          if (dataRef.scenario.error) {
            return {
              status: 'error',
              errorInfo: {
                kind: dataRef.scenario.error.kind,
                name: dataRef.scenario.error.name
              }
            }
          } else {
            let inputName: string
            if (dataRef.scenario.inputDescs.length > 0) {
              // TODO: Include all unresolved input names here
              inputName = dataRef.scenario.inputDescs[0].name
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

      // Associate the dataset with the op
      opRefDatasets.set(op, refDataset)
    }
  }

  // All data was resolved; run the check action on the dataset
  return checkTask.action.run(dataset, opRefDatasets)
}
