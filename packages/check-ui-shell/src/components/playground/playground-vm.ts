// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Readable } from 'svelte/store'
import { derived, writable } from 'svelte/store'

import type {
  CheckConfig,
  CheckDataCoordinator,
  CheckKey,
  CheckPredicateOp,
  CheckPredicateOpConstantRef,
  CheckPredicateOpRef,
  CheckPredicateReport,
  CheckPredicateTimeSpec,
  CheckResult,
  CheckScenario,
  DatasetKey
} from '@sdeverywhere/check-core'

import { CheckSummaryGraphBoxViewModel } from '../check/summary/check-summary-graph-box-vm'

import type { WizardCardsViewModel } from './wizard-cards-vm'
import { createOutputsCardViewModel } from './wizard-card-outputs-vm'
import { createDescCardViewModel } from './wizard-card-desc-vm'
import { createPredicatesCardViewModel } from './wizard-card-predicates-vm'

export interface PlaygroundViewModel {
  cards: WizardCardsViewModel
  graphBox: Readable<CheckSummaryGraphBoxViewModel>
}

export function createPlaygroundViewModel(
  checkConfig: CheckConfig,
  dataCoordinator: CheckDataCoordinator
): PlaygroundViewModel {
  const modelSpec = checkConfig.bundle.modelSpec

  const descCard = createDescCardViewModel()

  const outputsCard = createOutputsCardViewModel(modelSpec.outputVars)
  const activeDatasetKey: Readable<DatasetKey> = outputsCard.selectedOutputs.selectedItemId

  const predicatesCard = createPredicatesCardViewModel()
  const selectedOp = predicatesCard.opSelector.selectedValue
  const constantValue = predicatesCard.constantValue
  const timeStart = predicatesCard.timeStart
  const timeEnd = predicatesCard.timeEnd

  // TODO
  // const scenario = allInputsAtPositionScenario('at-default')
  const scenario: CheckScenario = undefined

  const graphBox = derived(
    [activeDatasetKey, selectedOp, constantValue, timeStart, timeEnd],
    ([$activeDatasetKey, $selectedOp, $constantValue, $timeStart, $timeEnd]) => {
      if ($activeDatasetKey === undefined) {
        return undefined
      }

      // XXX
      const op = $selectedOp as CheckPredicateOp
      const opRefPairs: [CheckPredicateOp, CheckPredicateOpRef][] = [[op, opConstantRef($constantValue)]]
      // TODO: Run check
      const passedResult: CheckResult = {
        status: 'passed'
      }
      // TODO: Get report from actual run
      const time: CheckPredicateTimeSpec = {
        after_incl: $timeStart,
        before_incl: $timeEnd
      }
      const predReport = predicateReport(1, opRefPairs, ['== 10'], passedResult, time)

      // runSuite(
      //   this.appModel.config,
      //   {
      //     onComplete: report => {
      //       const checkReport = report.checkReport
      //       console.log(checkReport)
      //     },
      //     onError: error => {
      //       // TODO: Show error message in browser
      //       console.error(error)
      //     }
      //   }
      // )

      return new CheckSummaryGraphBoxViewModel(dataCoordinator, scenario, $activeDatasetKey, predReport)
    }
  )

  return {
    cards: {
      desc: descCard,
      outputs: outputsCard,
      inputs: {
        todo: writable('TODO')
      },
      predicates: predicatesCard
    },
    graphBox
  }
}

function opConstantRef(value: number): CheckPredicateOpConstantRef {
  return {
    kind: 'constant',
    value
  }
}

function predicateReport(
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
