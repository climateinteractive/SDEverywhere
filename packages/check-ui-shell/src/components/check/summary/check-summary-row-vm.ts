// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'
import { writable } from 'svelte/store'

import type { CheckStatus, CheckScenarioReport, CheckTestReport } from '@sdeverywhere/check-core'

import type { CheckSummaryGraphBoxViewModel } from './check-summary-graph-box-vm'

/** Information about the test for context menu actions. */
export interface TestInfo {
  /** The name of the group containing this test. */
  groupName: string
  /** The test report. */
  testReport: CheckTestReport
}

export interface CheckSummaryRowViewModel {
  rowClasses: string
  status: CheckStatus
  span: string
  childRows: Writable<CheckSummaryRowViewModel[]>
  expanded: Writable<boolean>
  scenarioReport?: CheckScenarioReport
  /** Test info for test rows, used for context menu actions. */
  testInfo?: TestInfo
  graphBoxViewModel?: CheckSummaryGraphBoxViewModel
  onClicked: () => void
}

function charForStatus(status: CheckStatus): string {
  switch (status) {
    case 'passed':
      return '✓'
    case 'failed':
      return '✗'
    case 'error':
      return '‼'
    case 'skipped':
      return '–'
    default:
      return ''
  }
}

export function row(
  indent: number,
  rowClass: string,
  status: CheckStatus,
  content: string,
  initialExpanded: boolean,
  onClicked: () => void,
  graphBoxViewModel?: CheckSummaryGraphBoxViewModel
): CheckSummaryRowViewModel {
  // TODO: Control indentation in CSS
  const whitespace = '&ensp;'.repeat(2 + indent * 4)
  const statusChar = charForStatus(status)
  const statusSpan = `<span class="status-color-${status}">${statusChar}</span>`
  const span = `${whitespace}${statusSpan}&ensp;${content}`

  return {
    rowClasses: `${rowClass} ${status}`,
    status,
    span,
    childRows: writable([]),
    expanded: writable(initialExpanded),
    graphBoxViewModel,
    onClicked
  }
}
