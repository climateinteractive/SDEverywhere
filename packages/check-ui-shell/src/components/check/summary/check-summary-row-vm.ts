// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'
import { writable } from 'svelte/store'
import type { CheckStatus } from '@sdeverywhere/check-core'
import type { CheckSummaryGraphBoxViewModel } from './check-summary-graph-box-vm'

export interface CheckSummaryRowViewModel {
  rowClasses: string
  status: CheckStatus
  span: string
  graphBoxViewModel?: CheckSummaryGraphBoxViewModel
  graphVisible: Writable<boolean>
  onClicked: () => void
  // // Placeholder functionality
  // isPlaceholder?: boolean
  // placeholderType?: 'test-summary' | 'scenario-summary'
  // placeholderData?: {
  //   count: number
  //   status: CheckStatus
  //   label: string
  //   onExpand: () => void
  // }
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
  onClicked: () => void,
  graphBoxViewModel?: CheckSummaryGraphBoxViewModel,
  graphVisible = false
): CheckSummaryRowViewModel {
  const whitespace = '&ensp;'.repeat(2 + indent * 4)
  const statusChar = charForStatus(status)
  const statusSpan = `<span class="status-color-${status}">${statusChar}</span>`
  const span = `${whitespace}${statusSpan}&ensp;${content}`
  return {
    rowClasses: `${rowClass} ${status}`,
    status,
    span,
    graphBoxViewModel,
    graphVisible: writable(graphVisible),
    onClicked
    // isPlaceholder: false
  }
}

// export function placeholderRow(
//   indent: number,
//   placeholderType: 'test-summary' | 'scenario-summary',
//   status: CheckStatus,
//   count: number,
//   label: string,
//   onExpand: () => void
// ): CheckSummaryRowViewModel {
//   const whitespace = '&ensp;'.repeat(2 + indent * 4)
//   const statusChar = charForStatus(status)
//   const statusSpan = `<span class="status-color-${status}">${statusChar}</span>`
//   const span = `${whitespace}${statusSpan}&ensp;${count} ${label}`

//   return {
//     rowClasses: `${placeholderType} ${status}`,
//     status,
//     span,
//     graphBoxViewModel: undefined,
//     graphVisible: writable(false),
//     isPlaceholder: true,
//     placeholderType,
//     placeholderData: {
//       count,
//       status,
//       label,
//       onExpand
//     }
//   }
// }
