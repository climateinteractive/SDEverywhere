// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { CheckDataRef } from '../check-data-ref'
import { checkFunc } from '../check-func'
import type {
  CheckPlanDataset,
  CheckPlanGroup,
  CheckPlanPredicate,
  CheckPlanScenario,
  CheckPlanTest
} from '../check-planner'
import type { CheckPredicateOp } from '../check-predicate'
import type { CheckScenario } from '../check-scenario'
import type { CheckPredicateSpec } from '../check-spec'
import { dataset } from './mock-check-dataset'

export function predPlan(
  checkKey: number,
  predicateSpec: CheckPredicateSpec,
  dataRefs?: Map<CheckPredicateOp, CheckDataRef>
): CheckPlanPredicate {
  return {
    checkKey,
    action: {
      predicateSpec,
      run: checkFunc(predicateSpec)
    },
    dataRefs
  }
}

export function datasetPlan(prefix: string, varName: string, predicates: CheckPlanPredicate[]): CheckPlanDataset {
  return {
    checkDataset: dataset(prefix, varName),
    predicates
  }
}

export function unknownDatasetPlan(varName: string): CheckPlanDataset {
  return {
    checkDataset: {
      name: varName
    },
    predicates: []
  }
}

export function scenarioPlan(checkScenario: CheckScenario, datasets: CheckPlanDataset[]): CheckPlanScenario {
  return {
    checkScenario,
    datasets
  }
}

export function unknownInputsScenarioPlan(...inputNames: string[]): CheckPlanScenario {
  return {
    checkScenario: {
      inputDescs: inputNames.map(name => {
        return {
          name
        }
      })
    },
    datasets: []
  }
}

export function testPlan(name: string, scenarios: CheckPlanScenario[]): CheckPlanTest {
  return {
    name,
    scenarios
  }
}

export function groupPlan(name: string, tests: CheckPlanTest[]): CheckPlanGroup {
  return {
    name,
    tests
  }
}
