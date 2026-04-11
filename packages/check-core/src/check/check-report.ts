// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

import type { InputPosition } from '../_shared/scenario-spec-types'

import type { CheckDataRef } from './check-data-ref'
import type { CheckDataset } from './check-dataset'
import type { CheckResult } from './check-func'
import type { CheckKey, CheckPlan, CheckPlanPredicate } from './check-planner'
import type { CheckPredicateOp } from './check-predicate'
import { symbolForPredicateOp } from './check-predicate'
import type { CheckScenario, CheckScenarioInputDesc } from './check-scenario'
import type { CheckPredicateTimeOptions, CheckPredicateTimeRange, CheckPredicateTimeSpec } from './check-spec'

export type CheckStatus = 'passed' | 'failed' | 'error' | 'skipped'

export interface CheckPredicateOpConstantRef {
  kind: 'constant'
  value: number
}

export interface CheckPredicateOpDataRef {
  kind: 'data'
  dataRef: CheckDataRef
}

export type CheckPredicateOpRef = CheckPredicateOpConstantRef | CheckPredicateOpDataRef

export interface CheckPredicateReport {
  checkKey: CheckKey
  result: CheckResult
  opRefs: Map<CheckPredicateOp, CheckPredicateOpRef>
  opValues: string[]
  time?: CheckPredicateTimeSpec
  tolerance?: number
}

export interface CheckDatasetReport {
  checkDataset: CheckDataset
  status: CheckStatus
  predicates: CheckPredicateReport[]
}

export interface CheckScenarioReport {
  checkScenario: CheckScenario
  status: CheckStatus
  datasets: CheckDatasetReport[]
}

export interface CheckTestReport {
  name: string
  status: CheckStatus
  scenarios: CheckScenarioReport[]
}

export interface CheckGroupReport {
  name: string
  tests: CheckTestReport[]
}

export interface CheckReport {
  groups: CheckGroupReport[]
}

export type StyleFunc = (s: string) => string

export function buildCheckReport(checkPlan: CheckPlan, checkResults: Map<CheckKey, CheckResult>): CheckReport {
  const groupReports: CheckGroupReport[] = []

  for (const groupPlan of checkPlan.groups) {
    const testReports: CheckTestReport[] = []

    for (const testPlan of groupPlan.tests) {
      let testStatus: CheckStatus = 'passed'
      const scenarioReports: CheckScenarioReport[] = []
      for (const scenarioPlan of testPlan.scenarios) {
        let scenarioStatus: CheckStatus = 'passed'
        if (scenarioPlan.checkScenario.spec === undefined) {
          // The scenario spec didn't match known inputs; treat as an error
          testStatus = 'error'
          scenarioStatus = 'error'
        }
        const datasetReports: CheckDatasetReport[] = []

        for (const datasetPlan of scenarioPlan.datasets) {
          let datasetStatus: CheckStatus = 'passed'
          if (datasetPlan.checkDataset.datasetKey === undefined) {
            // The dataset spec didn't match known outputs; treat as an error
            testStatus = 'error'
            scenarioStatus = 'error'
            datasetStatus = 'error'
          }
          const predicateReports: CheckPredicateReport[] = []

          for (const predicatePlan of datasetPlan.predicates) {
            const checkKey = predicatePlan.checkKey
            const checkResult = checkResults.get(checkKey)
            if (checkResult) {
              if (checkResult.status !== 'passed') {
                // Set the status for parent groupings; 'error' status has higher
                // precendence than 'failed' status, and 'skipped' has lower precedence
                if (checkResult.status === 'error') {
                  testStatus = 'error'
                  scenarioStatus = 'error'
                  datasetStatus = 'error'
                } else if (checkResult.status === 'failed' && testStatus !== 'error') {
                  testStatus = 'failed'
                  scenarioStatus = 'failed'
                  datasetStatus = 'failed'
                } else if (checkResult.status === 'skipped' && testStatus === 'passed') {
                  testStatus = 'skipped'
                  scenarioStatus = 'skipped'
                  datasetStatus = 'skipped'
                }
              }
              predicateReports.push(predicateReport(predicatePlan, checkKey, checkResult))
            } else {
              // When there is no check result in the map (as may be the case when
              // restoring from a simplified `CheckSummary`, which only includes
              // failed/errored checks), assume that it passed
              // TODO: There may be other cases where no result means the test wasn't
              // run for some reason, so maybe we should not assume "passed" here always
              predicateReports.push(predicateReport(predicatePlan, checkKey, { status: 'passed' }))
            }
          }

          datasetReports.push({
            checkDataset: datasetPlan.checkDataset,
            status: datasetStatus,
            predicates: predicateReports
          })
        }

        scenarioReports.push({
          checkScenario: scenarioPlan.checkScenario,
          status: scenarioStatus,
          datasets: datasetReports
        })
      }

      testReports.push({
        name: testPlan.name,
        status: testStatus,
        scenarios: scenarioReports
      })
    }

    groupReports.push({
      name: groupPlan.name,
      tests: testReports
    })
  }

  return {
    groups: groupReports
  }
}

function predicateReport(
  predicatePlan: CheckPlanPredicate,
  checkKey: CheckKey,
  result: CheckResult
): CheckPredicateReport {
  if (result.status === 'error') {
    // For error cases, return a report that only includes the check result
    // (and don't process the ops)
    return {
      checkKey,
      result,
      opRefs: new Map(),
      opValues: []
    }
  }

  const predicateSpec = predicatePlan.action.predicateSpec
  const opRefs: Map<CheckPredicateOp, CheckPredicateOpRef> = new Map()
  const opValues: string[] = []

  function addOp(op: CheckPredicateOp): void {
    const sym = symbolForPredicateOp(op)
    const predOp = predicateSpec[op]

    if (predOp !== undefined) {
      let opRef: CheckPredicateOpRef
      let opValue: string
      if (typeof predOp === 'number') {
        const opConstantRef: CheckPredicateOpConstantRef = {
          kind: 'constant',
          value: predOp
        }
        opRef = opConstantRef
        opValue = `${sym} ${predOp}`
      } else {
        const dataRef = predicatePlan.dataRefs?.get(op)
        if (!dataRef) {
          return
        }
        const opDataRef: CheckPredicateOpDataRef = {
          kind: 'data',
          dataRef
        }
        opRef = opDataRef
        opValue = `${sym} '${dataRef.dataset.name}'`

        const refScenarioSpec = dataRef.scenario?.spec
        if (!refScenarioSpec) {
          return
        }
        if (predOp.scenario === 'inherit') {
          opValue += ` (w/ same scenario)`
        } else {
          if (refScenarioSpec.kind === 'all-inputs' && refScenarioSpec.position === 'at-default') {
            opValue += ` (w/ default scenario)`
          } else {
            // TODO: We could include the scenario/input details here, but it might
            // be too verbose, so for now use a generic string
            opValue += ` (w/ configured scenario)`
          }
        }
      }

      if (op === 'approx') {
        const tolerance = predicateSpec.tolerance || 0.1
        opValue += ` ±${tolerance}`
      }
      opRefs.set(op, opRef)
      opValues.push(opValue)
    }
  }

  addOp('gt')
  addOp('gte')
  addOp('lt')
  addOp('lte')
  addOp('eq')
  addOp('approx')
  if (opValues.length === 0) {
    opValues.push('INVALID PREDICATE')
  }

  return {
    checkKey,
    result,
    opRefs,
    opValues,
    time: predicateSpec.time,
    tolerance: predicateSpec.tolerance
  }
}

/**
 * Return a string representation of the given scenario.
 *
 * @param scenario The scenario report.
 * @param bold A function that applies bold styling to a string.
 */
export function scenarioMessage(scenario: CheckScenarioReport, bold: StyleFunc): string {
  const checkScenario = scenario.checkScenario
  if (checkScenario.spec === undefined) {
    if (checkScenario.error) {
      switch (checkScenario.error.kind) {
        case 'unknown-input-group':
          return `error: input group ${bold(checkScenario.error.name)} is unknown`
        case 'empty-input-group':
          return `error: input group ${bold(checkScenario.error.name)} is empty`
        default:
          assertNever(checkScenario.error.kind)
      }
    } else {
      const badInputNames = checkScenario.inputDescs.filter(d => d.inputVar === undefined).map(d => bold(d.name))
      const label = badInputNames.length === 1 ? 'input' : 'inputs'
      return `error: unknown ${label} ${badInputNames.join(', ')}`
    }
  }

  function positionName(position: InputPosition): string {
    switch (position) {
      case 'at-default':
        return 'default'
      case 'at-minimum':
        return 'minimum'
      case 'at-maximum':
        return 'maximum'
      default:
        assertNever(position)
    }
  }

  function inputMessage(inputDesc: CheckScenarioInputDesc): string {
    let msg = bold(inputDesc.name)
    if (inputDesc.position) {
      msg += ` is at ${bold(positionName(inputDesc.position))}`
      if (inputDesc.value !== undefined) {
        msg += ` (${inputDesc.value})`
      }
    } else if (inputDesc.value !== undefined) {
      msg += ` is ${bold(inputDesc.value.toString())}`
    }
    return msg
  }

  if (checkScenario.spec.kind === 'all-inputs') {
    // This is an "all inputs" scenario
    const position = checkScenario.spec.position
    return `when ${bold('all inputs')} are at ${bold(positionName(position))}...`
  } else if (checkScenario.inputGroupName) {
    // This is an "all inputs in group" scenario
    // TODO: Currently we don't have a special `ScenarioSpec` kind for the "all inputs
    // in group" case, so we use a multi-setting `ScenarioSpec`; therefore we have to
    // dig out the position from the first setting
    let position: InputPosition = 'at-default'
    if (checkScenario.spec.settings[0].kind === 'position') {
      position = checkScenario.spec.settings[0].position
    }
    const groupName = checkScenario.inputGroupName
    return `when all inputs in ${bold(groupName)} are at ${bold(positionName(position))}...`
  } else {
    // This scenario includes one or more inputs
    // TODO: This will get hard to read when there are many inputs; consider displaying
    // as a bulleted list or something
    const inputMessages = checkScenario.inputDescs.map(inputMessage).join(' and ')
    return `when ${inputMessages}...`
  }
}

/**
 * Return a string representation of the given dataset.
 *
 * @param dataset The dataset report.
 * @param bold A function that applies bold styling to a string.
 */
export function datasetMessage(dataset: CheckDatasetReport, bold: StyleFunc): string {
  const checkDataset = dataset.checkDataset
  if (checkDataset.datasetKey === undefined) {
    return `error: ${bold(checkDataset.name)} did not match any datasets`
  } else {
    return `then ${bold(checkDataset.name)}...`
  }
}

/**
 * Return a string representation of the given predicate.
 *
 * @param predicate The predicate report.
 * @param bold A function that applies bold styling to a string.
 */
export function predicateMessage(predicate: CheckPredicateReport, bold: StyleFunc): string {
  const result = predicate.result
  if (result.status === 'error') {
    if (result.message) {
      return `error: ${predicate.result.message}`
    } else if (result.errorInfo) {
      switch (result.errorInfo.kind) {
        case 'unknown-dataset':
          return `error: referenced dataset ${bold(result.errorInfo.name)} is unknown`
        case 'unknown-input':
          return `error: referenced input ${bold(result.errorInfo.name)} is unknown`
        case 'unknown-input-group':
          return `error: referenced input group ${bold(result.errorInfo.name)} is unknown`
        case 'empty-input-group':
          return `error: referenced input group ${bold(result.errorInfo.name)} is empty`
        default:
          assertNever(result.errorInfo.kind)
      }
    } else {
      return `unknown error`
    }
  }

  const predicateParts = predicate.opValues.map(bold).join(' and ')
  let msg = `should be ${predicateParts}`

  if (predicate.time !== undefined) {
    if (typeof predicate.time === 'number') {
      msg += ` in ${bold(predicate.time.toString())}`
    } else {
      let minTime: number
      let maxTime: number
      let minIncl: boolean
      let maxIncl: boolean
      if (Array.isArray(predicate.time)) {
        // This is an inclusive range shorthand (e.g. `time: [0, 1]`)
        const timeSpec = predicate.time as CheckPredicateTimeRange
        minTime = timeSpec[0]
        maxTime = timeSpec[1]
        minIncl = true
        maxIncl = true
      } else {
        // This is a full time spec with `after` and/or `before`
        const timeSpec = predicate.time as CheckPredicateTimeOptions
        if (timeSpec.after_excl !== undefined) {
          minTime = timeSpec.after_excl
          minIncl = false
        } else if (timeSpec.after_incl !== undefined) {
          minTime = timeSpec.after_incl
          minIncl = true
        }
        if (timeSpec.before_excl !== undefined) {
          maxTime = timeSpec.before_excl
          maxIncl = false
        } else if (timeSpec.before_incl !== undefined) {
          maxTime = timeSpec.before_incl
          maxIncl = true
        }
      }
      if (minTime !== undefined && maxTime !== undefined) {
        const prefix = minIncl ? '[' : '('
        const suffix = maxIncl ? ']' : ')'
        const range = `${prefix}${minTime}, ${maxTime}${suffix}`
        msg += ` in ${bold(range)}`
      } else if (minTime !== undefined) {
        const prefix = minIncl ? 'in/after' : 'after'
        msg += ` ${prefix} ${bold(minTime.toString())}`
      } else if (maxTime !== undefined) {
        const prefix = maxIncl ? 'in/before' : 'before'
        msg += ` ${prefix} ${bold(maxTime.toString())}`
      }
    }
  }

  if (predicate.result.status === 'failed') {
    if (predicate.result.failValue !== undefined) {
      msg += ` but got ${bold(predicate.result.failValue.toString())}`
      if (predicate.result.failRefValue !== undefined) {
        // TODO: Include tolerance value here (e.g. "expected ≈ 6.5 ±0.3")
        const failSym = symbolForPredicateOp(predicate.result.failOp)
        const refValue = `${failSym} ${predicate.result.failRefValue.toString()}`
        msg += ` (expected ${bold(refValue)})`
      }
    } else if (predicate.result.message) {
      msg += ` but got ${bold(predicate.result.message)}`
    }
    if (predicate.result.failTime !== undefined) {
      msg += ` in ${bold(predicate.result.failTime.toString())}`
    }
  } else if (predicate.result.status === 'error' && predicate.result.message) {
    msg += ` but got error: ${bold(predicate.result.message)}`
  }

  return msg
}
