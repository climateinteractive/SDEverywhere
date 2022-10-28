// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { dataRef } from '../check-data-ref'
import type { CheckDataset } from '../check-dataset'
import type { CheckResult } from '../check-func'
import type { CheckKey } from '../check-planner'
import type { CheckPredicateOp } from '../check-predicate'
import type {
  CheckDatasetReport,
  CheckGroupReport,
  CheckPredicateOpConstantRef,
  CheckPredicateOpDataRef,
  CheckPredicateOpRef,
  CheckPredicateReport,
  CheckScenarioReport,
  CheckStatus,
  CheckTestReport
} from '../check-report'
import type { CheckScenario } from '../check-scenario'
import type { CheckPredicateTimeSpec } from '../check-spec'
import { dataset } from './mock-check-dataset'

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
  subNames: string[],
  status: CheckStatus,
  predicates: CheckPredicateReport[]
): CheckDatasetReport {
  const checkDataset = dataset(prefix, varName, subNames)
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
