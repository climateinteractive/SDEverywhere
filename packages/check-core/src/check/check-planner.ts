// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'
import type { ModelSpec } from '../bundle/bundle-types'
import type { CheckAction } from './check-action'
import { actionForPredicate } from './check-action'
import type { CheckDataRef, CheckDataRefKey } from './check-data-ref'
import type { CheckDataset } from './check-dataset'
import { expandDatasets } from './check-dataset'
import type { CheckPredicateOp } from './check-predicate'
import type { CheckScenario } from './check-scenario'
import { expandScenarios } from './check-scenario'
import type { CheckDatasetSpec, CheckNameSpec, CheckPredicateSpec, CheckScenarioSpec, CheckSpec } from './check-spec'

export type CheckKey = number

export interface CheckPlanPredicate {
  /** The key that associates this predicate with a check task. */
  checkKey: CheckKey
  /** The action that performs the check for a scenario/dataset/predicate. */
  action: CheckAction
  /** The op->ref pairs for any reference data needed for performing the check. */
  dataRefs?: Map<CheckPredicateOp, CheckDataRef>
}

export interface CheckPlanDataset {
  checkDataset: CheckDataset
  predicates: CheckPlanPredicate[]
}

export interface CheckPlanScenario {
  checkScenario: CheckScenario
  datasets: CheckPlanDataset[]
}

export interface CheckPlanTest {
  name: string
  scenarios: CheckPlanScenario[]
}

export interface CheckPlanGroup {
  name: string
  tests: CheckPlanTest[]
}

/**
 * Contains the metadata needed to perform a check for a scenario/dataset/predicate
 * combination.
 */
export interface CheckTask {
  /** The scenario that will be configured. */
  scenario: CheckScenario
  /** The dataset to be checked. */
  dataset: CheckDataset
  /** The action that performs the check for a scenario/dataset/predicate. */
  action: CheckAction
  /** The op->ref pairs for any reference data needed for performing the check. */
  dataRefs?: Map<CheckPredicateOp, CheckDataRef>
  /** Whether the check should be skipped. */
  skip?: boolean
}

export interface CheckPlan {
  /**
   * The top-level plan groups (one plan for each `describe` group).
   */
  groups: CheckPlanGroup[]
  /**
   * The map of all check tasks to be performed.
   */
  tasks: Map<CheckKey, CheckTask>
  /**
   * All data references for the checks.  These are kept separate so that the
   * reference data can be fetched in advance (and kept in memory) before
   * the actual checks are performed.
   *
   * TODO: Ideally we would have a more sophisticated system for managing
   * data references so that we don't need to keep all reference data in
   * memory, but for now it's easier to just load all the reference data
   * as a preliminary step.
   */
  dataRefs: Map<CheckDataRefKey, CheckDataRef>
}

export class CheckPlanner {
  private readonly groups: CheckPlanGroup[] = []
  private readonly tasks: Map<CheckKey, CheckTask> = new Map()
  private readonly dataRefs: Map<CheckDataRefKey, CheckDataRef> = new Map()
  private checkKey = 1

  constructor(private readonly modelSpec: ModelSpec) {}

  addAllChecks(checkSpec: CheckSpec, skipChecks: CheckNameSpec[]): void {
    function skipCheckKey(groupName: string, testName: string): string {
      return `${groupName.toLowerCase()} :: ${testName.toLowerCase()}`
    }

    // Convert to a Set for efficient lookup
    const skipChecksSet = new Set(skipChecks.map(check => skipCheckKey(check.groupName, check.testName)))

    // Iterate over all groups
    for (const groupSpec of checkSpec.groups) {
      const groupName = groupSpec.describe

      // Iterate over the tests in this group
      const planTests: CheckPlanTest[] = []
      for (const testSpec of groupSpec.tests) {
        const testName = testSpec.it

        // Check if this test should be skipped
        const shouldSkip = skipChecksSet.has(skipCheckKey(groupName, testName))

        // TODO: We no longer offer a "Simplify Scenarios" option in the UI, but
        // we will leave the option here in case we add it back later
        const simplifyScenarios = false

        // Expand the set of scenarios for this test
        const checkScenarios = expandScenarios(this.modelSpec, testSpec.scenarios || [], simplifyScenarios)

        // Expand the set of datasets for this test
        const checkDatasets: CheckDataset[] = []
        for (const datasetSpec of testSpec.datasets) {
          checkDatasets.push(...expandDatasets(this.modelSpec, datasetSpec))
        }

        // Build a check function for each predicate in this test
        const checkActions: CheckAction[] = []
        for (const predicateSpec of testSpec.predicates) {
          // Add the action that runs the check
          checkActions.push(actionForPredicate(predicateSpec))
        }

        // Build the scenario/dataset/action combinations
        const planScenarios: CheckPlanScenario[] = []
        for (const checkScenario of checkScenarios) {
          if (checkScenario.spec === undefined) {
            // The scenario spec didn't match known inputs; add it to the plan
            // so that it can be reported as an error later
            planScenarios.push({
              checkScenario,
              datasets: []
            })
            continue
          }

          const planDatasets: CheckPlanDataset[] = []

          // Add the datasets for the current scenario
          for (const checkDataset of checkDatasets) {
            if (checkDataset.datasetKey === undefined) {
              // The dataset spec didn't match known outputs; add it to the plan
              // so that it can be reported as an error later
              planDatasets.push({
                checkDataset,
                predicates: []
              })
              continue
            }

            const planPredicates: CheckPlanPredicate[] = []

            // Add the predicate tasks for the current scenario and dataset
            for (const checkAction of checkActions) {
              // If the predicate references other datasets (for cases where
              // the check is against a dataset rather than a constant value),
              // then keep track of those references so that we can load the
              // data in advance of performing the actual checks
              const dataRefs = this.addDataRefs(checkAction.predicateSpec, checkScenario, checkDataset)

              // Add the predicate to the plan
              const key = this.checkKey++
              planPredicates.push({
                checkKey: key,
                action: checkAction,
                dataRefs
              })

              // Add a task that runs the check for the scenario and dataset
              this.tasks.set(key, {
                scenario: checkScenario,
                dataset: checkDataset,
                action: checkAction,
                dataRefs,
                skip: shouldSkip
              })
            }

            planDatasets.push({
              checkDataset,
              predicates: planPredicates
            })
          }

          planScenarios.push({
            checkScenario,
            datasets: planDatasets
          })
        }

        planTests.push({
          name: testName,
          scenarios: planScenarios
        })
      }

      this.groups.push({
        name: groupName,
        tests: planTests
      })
    }
  }

  buildPlan(): CheckPlan {
    return {
      groups: this.groups,
      tasks: this.tasks,
      dataRefs: this.dataRefs
    }
  }

  /**
   * Record any references to additional datasets contained in the given predicate.
   * For example, if the predicate is:
   * ```
   *   gt:
   *     dataset:
   *       name: 'XYZ'
   *     scenario:
   *       inputs: all
   *       at: default
   * ```
   * this will add a reference to the scenario/dataset pair so that the data can
   * be fetched in a later stage.
   *
   * @param predicateSpec The predicate spec.
   * @param checkScenario The scenario in which the dataset is being checked.
   * @param checkDataset The dataset that is being checked.
   */
  private addDataRefs(
    predicateSpec: CheckPredicateSpec,
    checkScenario: CheckScenario,
    checkDataset: CheckDataset
  ): Map<CheckPredicateOp, CheckDataRef> | undefined {
    // This map will be created lazily (only when there are data refs for one
    // or more ops)
    let dataRefs: Map<CheckPredicateOp, CheckDataRef>

    const addDataRef = (op: CheckPredicateOp) => {
      const predOp = predicateSpec[op]
      if (predOp === undefined || typeof predOp === 'number') {
        return
      }

      // Resolve the dataset
      let refDataset: CheckDataset
      if (typeof predOp.dataset === 'string') {
        switch (predOp.dataset) {
          case 'inherit':
            // Use the same dataset as the one being checked (this is typically used
            // when checking one dataset in one scenario against the same dataset in
            // a different scenario)
            refDataset = checkDataset
            break
          default:
            assertNever(predOp.dataset)
        }
      } else {
        // Resolve the dataset for the given name; if it does not expand
        // to a single valid dataset, treat it as an error case
        const refDatasetSpec: CheckDatasetSpec = { name: predOp.dataset.name }
        const matchedRefDatasets = expandDatasets(this.modelSpec, refDatasetSpec)
        if (matchedRefDatasets.length === 1) {
          refDataset = matchedRefDatasets[0]
        } else {
          // We failed to match a dataset (or the match expanded to multiple datasets);
          // use an empty CheckDataset so that we can report the error later
          refDataset = {
            name: predOp.dataset.name
          }
        }
      }

      // Resolve the scenario
      let refScenario: CheckScenario
      if (typeof predOp.scenario === 'string') {
        switch (predOp.scenario) {
          case 'inherit':
            // Use the same scenario as the one being checked (this is typically used
            // when checking one dataset in one scenario against a different dataset in
            // the same scenario)
            refScenario = checkScenario
            break
          default:
            assertNever(predOp.scenario)
        }
      } else {
        // The following will convert the `CheckPredicateRefDataScenarioSpec` to a
        // `CheckScenario`.  If no scenario was included for the predicate/op, we use an
        // empty array, which will resolve to the "all inputs at default" scenario.
        const refScenarioSpecs: CheckScenarioSpec[] = predOp.scenario ? [predOp.scenario] : []
        const matchedRefScenarios = expandScenarios(this.modelSpec, refScenarioSpecs, true)
        if (matchedRefScenarios.length === 1) {
          refScenario = matchedRefScenarios[0]
        }
        if (refScenario === undefined) {
          // We failed to match a scenario/input; use an empty CheckScenario so that
          // we can report the error later
          refScenario = {
            inputDescs: []
          }
        }
      }

      // Create the data ref that will be used for this predicate/op
      let dataRefKey: CheckDataRefKey
      if (refScenario.spec && refDataset.datasetKey) {
        dataRefKey = `${refScenario.spec.uid}::${refDataset.datasetKey}`
      }
      const dataRef: CheckDataRef = {
        key: dataRefKey,
        dataset: refDataset,
        scenario: refScenario
      }

      // Add the data ref to the plan only if the key is defined
      if (dataRefKey) {
        this.dataRefs.set(dataRefKey, dataRef)
      }

      // Add an entry to the map so that the op is associated with a particular
      // reference dataset
      if (dataRefs === undefined) {
        dataRefs = new Map()
      }
      dataRefs.set(op, dataRef)
    }

    addDataRef('gt')
    addDataRef('gte')
    addDataRef('lt')
    addDataRef('lte')
    addDataRef('eq')
    addDataRef('approx')

    return dataRefs
  }
}
