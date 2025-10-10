// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'
import { writable } from 'svelte/store'

import type { CheckStatus } from '@sdeverywhere/check-core'

import type { CheckSummaryGraphBoxViewModel } from './check-summary-graph-box-vm'

export interface CheckSummaryRowViewModel {
  rowClasses: string
  status: CheckStatus
  span: string
  childRows: Writable<CheckSummaryRowViewModel[]>
  expanded: Writable<boolean>
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
