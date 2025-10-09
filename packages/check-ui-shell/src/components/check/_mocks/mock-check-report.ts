// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  CheckDataset,
  CheckScenario,
  CheckDataRef,
  CheckPredicateOpConstantRef,
  CheckPredicateOpDataRef,
  CheckDatasetReport,
  CheckGroupReport,
  CheckKey,
  CheckPredicateOp,
  CheckPredicateOpRef,
  CheckPredicateReport,
  CheckPredicateTimeSpec,
  CheckResult,
  CheckScenarioReport,
  CheckStatus,
  CheckTestReport
} from '@sdeverywhere/check-core'

import { allInputsAtPositionSpec } from '../../../_mocks/mock-scenario-spec'

export function dataset(prefix: string, varName: string): CheckDataset {
  const varId = `_${varName.toLowerCase()}`
  const datasetKey = `${prefix}_${varId}`
  return {
    datasetKey,
    name: varName
  }
}

function dataRef(dataset: CheckDataset, scenario?: CheckScenario): CheckDataRef {
  if (!scenario) {
    scenario = {
      spec: allInputsAtPositionSpec('at-default'),
      inputDescs: []
    }
  }
  return {
    key: `${scenario.spec.uid}::${dataset.datasetKey}`,
    dataset,
    scenario
  }
}

export function opConstantRef(value: number): CheckPredicateOpConstantRef {
  return {
    kind: 'constant',
    value
  }
}

export function opDataRef(dataset: CheckDataset, scenario?: CheckScenario): CheckPredicateOpDataRef {
  return {
    kind: 'data',
    dataRef: dataRef(dataset, scenario)
  }
}

export function predicateReport(
  checkKey: CheckKey,
  opRefPairs: [CheckPredicateOp, CheckPredicateOpRef][],
  opValues?: string[],
  result?: CheckResult,
  time?: CheckPredicateTimeSpec
): CheckPredicateReport {
  const opRefs: Map<CheckPredicateOp, CheckPredicateOpRef> = new Map(opRefPairs)
  return {
    checkKey,
    result: result || { status: 'passed' },
    opRefs,
    opValues,
    time
  }
}

export function errorPredicateReport(checkKey: CheckKey, result?: CheckResult): CheckPredicateReport {
  const opRefs: Map<CheckPredicateOp, CheckPredicateOpRef> = new Map()
  return {
    checkKey,
    result: result || { status: 'error' },
    opRefs,
    opValues: []
  }
}

export function datasetReport(
  prefix: string,
  varName: string,
  status: CheckStatus,
  predicates: CheckPredicateReport[]
): CheckDatasetReport {
  const checkDataset = dataset(prefix, varName)
  return {
    checkDataset,
    status,
    predicates
  }
}

export function errorDatasetReport(name: string): CheckDatasetReport {
  return {
    checkDataset: {
      name
    },
    status: 'error',
    predicates: []
  }
}

export function scenarioReport(
  checkScenario: CheckScenario,
  status: CheckStatus,
  datasets: CheckDatasetReport[]
): CheckScenarioReport {
  return {
    checkScenario,
    status,
    datasets
  }
}

export function errorScenarioReport(...unknownInputNames: string[]): CheckScenarioReport {
  return {
    checkScenario: {
      inputDescs: unknownInputNames.map(name => {
        return {
          name
        }
      })
    },
    status: 'error',
    datasets: []
  }
}

export function testReport(name: string, status: CheckStatus, scenarios: CheckScenarioReport[]): CheckTestReport {
  return {
    name,
    status,
    scenarios
  }
}

export function groupReport(name: string, tests: CheckTestReport[]): CheckGroupReport {
  return {
    name,
    tests
  }
}
