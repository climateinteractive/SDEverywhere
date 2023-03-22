// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ComparisonConfig, ComparisonGroupSummary, ComparisonTestSummary } from '@sdeverywhere/check-core'
import { categorizeComparisonTestSummaries } from '@sdeverywhere/check-core'
import assertNever from 'assert-never'

// import type { CompareGraphsViewModel } from '../graphs/compare-graphs-vm'

import type { CompareSummaryRowViewModel } from './compare-summary-row-vm'

export interface CompareSummarySectionViewModel {
  // header: string
  header: CompareSummaryRowViewModel
  rows: CompareSummaryRowViewModel[]
}

export interface CompareSummaryViewGroupViewModel {
  title: string
  header: CompareSummaryRowViewModel
  rows: CompareSummaryRowViewModel[]
}

export interface CompareSummaryViewsSectionViewModel {
  viewGroups: CompareSummaryViewGroupViewModel[]
}

export interface CompareSummaryViewModel {
  allRows: CompareSummaryRowViewModel[]
  viewsSection: CompareSummaryViewsSectionViewModel
  allGraphs?: CompareSummarySectionViewModel
  scenariosOnlyInLeft?: CompareSummarySectionViewModel
  scenariosOnlyInRight?: CompareSummarySectionViewModel
  scenariosWithDiffs?: CompareSummarySectionViewModel
  scenariosWithoutDiffs?: CompareSummarySectionViewModel
  datasetsOnlyInLeft?: CompareSummarySectionViewModel
  datasetsOnlyInRight?: CompareSummarySectionViewModel
  datasetsWithDiffs?: CompareSummarySectionViewModel
  datasetsWithoutDiffs?: CompareSummarySectionViewModel
}

export function createCompareSummaryViewModel(
  comparisonConfig: ComparisonConfig,
  terseSummaries: ComparisonTestSummary[]
): CompareSummaryViewModel {
  // const viewsSection: CompareSummaryViewsSectionViewModel = {
  //   viewGroups: [
  //     {
  //       title: 'HI',
  //       // Th
  //       header: rowForView('Baseline', undefined, true),
  //       rows: [
  //         rowForView('All Graphs'),
  //         rowForView('Temperature'),
  //         rowForView('GHGs'),
  //         rowForView('Sea Level Rise'),
  //         rowForView('Energy Demand')
  //       ]
  //     },
  //     {
  //       title: 'HI',
  //       header: rowForView('Coal > Squeezing the balloon', undefined, true),
  //       rows: [
  //         rowForView('Coal - max subsidy', '(-20 | -15)'),
  //         rowForView('Coal - baseline', '(0)'),
  //         rowForView('Coal - low tax', '(10)'),
  //         rowForView('Coal - medium tax', '(30)'),
  //         rowForView('Coal - high tax', '(50)'),
  //         rowForView('Coal - max tax', '(110 | 100)')
  //       ]
  //     },
  //     {
  //       title: 'HI',
  //       header: rowForView('Transport Electrification', undefined, true),
  //       rows: [
  //         rowForView('Transport Elec - baseline', '(0)'),
  //         rowForView('Transport Elec - low', '(25)'),
  //         rowForView('Transport Elec - medium', '(50)'),
  //         rowForView('Transport Elec - high', '(75)'),
  //         rowForView('Transport Elec - max', '(100)') // TODO: Flag that id/range has changed?
  //       ]
  //     }
  //   ]
  // }

  // const viewGroupViewModels: CompareSummaryViewGroupViewModel[] = []
  // for (const viewGroup of compareConfig.viewGroups) {
  //   const viewRows: CompareSummaryRowViewModel[] = viewGroup.views.map(view => {
  //     return {
  //       groupName: view.title,
  //       secondaryName: view.subtitle,
  //       diffPercentByBucket: [20, 20, 20, 20, 20],
  //       totalScore: 0,
  //       groupKey: 'KEY',
  //       striped: false
  //     }
  //   })

  //   viewGroupViewModels.push({
  //     title: 'HI',
  //     header: rowForView(viewGroup.title, undefined, true),
  //     rows: viewRows
  //   })
  // }

  const viewsSection: CompareSummaryViewsSectionViewModel = {
    viewGroups: [] //viewGroupViewModels
  }

  // function rowForInputScenario(primary: string, secondary?: string): CompareSummaryRowViewModel {
  //   return {
  //     groupName: primary,
  //     secondaryName: secondary,
  //     diffPercentByBucket: [0, 0, 0, 0],
  //     totalScore: 0,
  //     groupKey: 'KEY',
  //     striped: true
  //   }
  // }

  // const scenarioRows: CompareSummaryRowViewModel[] = [
  //   rowForInputScenario('Var > Climate Sensitivity to 2x CO2', 'at minimum'),
  //   rowForInputScenario('Var > Climate Sensitivity to 2x CO2', 'at maximum'),
  //   rowForInputScenario('Main > Coal', 'at max subsidy'), //, '(-20 | -15)'),
  //   rowForInputScenario('Main > Coal', 'at baseline'), //, '(0)'),
  //   rowForInputScenario('Main > Coal', 'at low tax'), //, '(10)'),
  //   rowForInputScenario('Main > Coal', 'at medium tax'), //, '(30)'),
  //   rowForInputScenario('Main > Coal', 'at high tax'), //, '(50)')
  //   rowForInputScenario('Main > Coal', 'at max tax') //, '(110 | 100)'),
  // ]

  // function message(kind: 'err' | 'warn', s: string): string {
  //   const statusClass = `status-color-${kind === 'err' ? 'failed' : 'error'}`
  //   const statusChar = kind === 'err' ? '✗' : '‼'
  //   return `<span class="message"><span class="${statusClass}">${statusChar}</span>&ensp;${s}</span>`
  // }

  // function withBundleColor(kind: 'left' | 'right', s: string): string {
  //   const side = kind === 'left' ? 0 : 1
  //   return `<span class="dataset-color-${side}">${s}</span>`
  // }

  // const bundleL = compareConfig.bundleL
  // const bundleR = compareConfig.bundleR
  // const scenarioRows: CompareSummaryRowViewModel[] = []
  // const scenarioRows: CompareSummaryRowViewModel[] = compareConfig.scenarios.map(scenario => {
  //   // let title: string
  //   // let subtitle: string
  //   let valuesPart: string
  //   let messagesPart: string
  //   let striped = false
  //   if (scenario.kind === 'scenario-with-inputs') {
  //     for (const input of scenario.resolvedInputs) {
  //       const errL = input.stateL.error?.kind
  //       const errR = input.stateR.error?.kind
  //       if (errL === 'unknown-input' || errR === 'unknown-input') {
  //         // Show warning/status message when input is unknown
  //         striped = true
  //         if (errL === 'unknown-input' && errR === 'unknown-input') {
  //           messagesPart = message('err', 'Unknown input')
  //         } else if (errL === 'unknown-input') {
  //           messagesPart = message('warn', `Input only defined in ${withBundleColor('right', bundleR.name)}`)
  //         } else if (errR === 'unknown-input') {
  //           messagesPart = message('warn', `Input only defined in ${withBundleColor('left', bundleL.name)}`)
  //         }
  //       } else if (errL == 'invalid-value' || errR === 'invalid-value') {
  //         // TODO: Show warning/status message when input value is out of range
  //       } else if (input.stateL.inputVar && input.stateR.inputVar) {
  //         if (input.stateL.inputVar.varName !== input.stateR.inputVar.varName) {
  //           let msg = 'Variable name changed:'
  //           msg += ` ${withBundleColor('left', input.stateL.inputVar.varName)}`
  //           msg += ` → `
  //           msg += ` ${withBundleColor('right', input.stateR.inputVar.varName)}`
  //           messagesPart = message('warn', msg)
  //         }
  //       }
  //     }
  //   }

  //   return {
  //     groupName: scenario.title,
  //     secondaryName: scenario.subtitle,
  //     valuesPart,
  //     messagesPart,
  //     diffPercentByBucket: [20, 20, 20, 20, 20],
  //     totalScore: 0,
  //     groupKey: 'KEY',
  //     striped
  //   }
  // })

  // Helper that prepends the given string with `count` and replaces `<replace>`
  // with `<replace>s` if count is not one
  function countString(count: number, s: string, replace: string): string {
    return `${count} ${count !== 1 ? s.replace(replace, `${replace}s`) : s}`
  }

  function rowForGroupSummary(groupSummary: ComparisonGroupSummary): CompareSummaryRowViewModel {
    let title: string
    let subtitle: string
    const root = groupSummary.root
    switch (root.kind) {
      case 'dataset-root': {
        // TODO: Handle renames better
        const outputVar = root.dataset.outputVarR || root.dataset.outputVarL
        title = outputVar.varName
        subtitle = outputVar.sourceName
        break
      }
      case 'scenario-root':
        title = root.scenario.title
        subtitle = root.scenario.subtitle
        break
      default:
        assertNever(root)
    }

    return {
      title,
      subtitle,
      diffPercentByBucket: groupSummary.scores?.diffPercentByBucket,
      groupSummary,
      groupKey: groupSummary.group.key
    }
  }

  function section(
    groupSummaries: ComparisonGroupSummary[],
    headerText: string,
    count = true
  ): CompareSummarySectionViewModel | undefined {
    if (groupSummaries.length > 0) {
      const rows: CompareSummaryRowViewModel[] = groupSummaries.map(rowForGroupSummary)

      let replace: string
      if (headerText.includes('scenario')) {
        replace = 'scenario'
      } else {
        replace = 'variable'
      }

      if (count) {
        headerText = countString(rows.length, headerText, replace)
      }

      const headerRow: CompareSummaryRowViewModel = {
        title: headerText,
        header: true
      }

      return {
        header: headerRow,
        rows
      }
    } else {
      return undefined
    }
  }

  // Group and categorize the comparison results
  const comparisonGroups = categorizeComparisonTestSummaries(comparisonConfig, terseSummaries)
  const groupsByScenario = comparisonGroups.byScenario
  const groupsByDataset = comparisonGroups.byDataset

  // Build the by-scenario comparison sections
  // TODO: Replace left and right here
  const scenariosOnlyInLeft = section(groupsByScenario.onlyInLeft, 'scenario only valid in [left]…')
  const scenariosOnlyInRight = section(groupsByScenario.onlyInRight, 'scenario only valid in [right]…')
  const scenariosWithDiffs = section(groupsByScenario.withDiffs, 'scenario producing differences…')
  const scenariosWithoutDiffs = section(
    groupsByScenario.withoutDiffs,
    'No differences produced by the following scenarios…',
    false
  )

  // Build the by-dataset comparison sections
  const datasetsOnlyInLeft = section(groupsByDataset.onlyInLeft, 'removed output variable…')
  const datasetsOnlyInRight = section(groupsByDataset.onlyInRight, 'added output variable…')
  const datasetsWithDiffs = section(groupsByDataset.withDiffs, 'output variable with differences…')
  const datasetsWithoutDiffs = section(
    groupsByDataset.withoutDiffs,
    'No differences detected for the following outputs…',
    false
  )

  // Create a flat array of all rows to make it easier to set up the navigation links
  const allRows: CompareSummaryRowViewModel[] = []
  function addRows(section?: CompareSummarySectionViewModel): void {
    if (section) {
      allRows.push(...section.rows)
    }
  }
  addRows(scenariosOnlyInLeft)
  addRows(scenariosOnlyInRight)
  addRows(scenariosWithDiffs)
  addRows(scenariosWithoutDiffs)
  addRows(datasetsOnlyInLeft)
  addRows(datasetsOnlyInRight)
  addRows(datasetsWithDiffs)
  addRows(datasetsWithoutDiffs)

  // Build the summary view model
  return {
    allRows,
    viewsSection,
    scenariosOnlyInLeft,
    scenariosOnlyInRight,
    scenariosWithDiffs,
    scenariosWithoutDiffs,
    datasetsOnlyInLeft,
    datasetsOnlyInRight,
    datasetsWithDiffs,
    datasetsWithoutDiffs
  }
}
