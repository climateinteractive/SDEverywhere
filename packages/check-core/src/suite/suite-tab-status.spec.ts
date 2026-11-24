// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { CheckReport } from '../check/check-report'
import {
  datasetReport,
  errorDatasetReport,
  errorPredicateReport,
  groupReport,
  opConstantRef,
  predicateReport,
  scenarioReport,
  testReport
} from '../check/_mocks/mock-check-report'
import { allAtPos } from '../check/_mocks/mock-check-scenario'
import type {
  ComparisonGroupSummariesByCategory,
  ComparisonGroupSummary
} from '../comparison/report/comparison-group-types'
import type { ComparisonViewGroupSummary } from '../comparison/report/comparison-view-summaries'
import {
  allAtPos as comparisonAllAtPos,
  viewGroup,
  viewWithScenario
} from '../comparison/_shared/_mocks/mock-resolved-types'

import {
  countCheckPredicates,
  countComparisonGroupsWithDiffs,
  getChecksTabStatus,
  getComparisonTabStatus,
  getComparisonViewsTabDiffCount
} from './suite-tab-status'

describe('countCheckPredicates', () => {
  it('should count the predicates by status, with a scenario or dataset that has none as an error, and a test with no scenarios as skipped', () => {
    const passed = predicateReport(1, [['gt', opConstantRef(0)]])
    const failed = predicateReport(2, [['lt', opConstantRef(50)]], undefined, { status: 'failed' })
    const checkReport: CheckReport = {
      groups: [
        groupReport('Group', [
          testReport('test 1', 'failed', [
            scenarioReport(allAtPos('at-default'), 'failed', [
              datasetReport('Model', 'Temperature', 'failed', [passed, passed, failed]),
              datasetReport('Model', 'Emissions', 'error', [errorPredicateReport(3)]),
              errorDatasetReport('Unknown')
            ]),
            scenarioReport(allAtPos('at-maximum'), 'error', [])
          ]),
          testReport('test 2', 'skipped', [])
        ])
      ]
    }
    expect(countCheckPredicates(checkReport)).toEqual({ total: 7, passed: 2, failed: 1, errors: 3, skipped: 1 })
  })
})

describe('getChecksTabStatus', () => {
  const counts = (passed: number, failed: number, errors: number, skipped: number) => ({
    total: passed + failed + errors + skipped,
    passed,
    failed,
    errors,
    skipped
  })

  it('should say "no checks" when there are none', () => {
    expect(getChecksTabStatus(counts(0, 0, 0, 0))).toEqual({ status: 'none', subtitle: 'no checks' })
  })

  it('should say how many checks failed or had errors', () => {
    expect(getChecksTabStatus(counts(5, 2, 1, 0))).toEqual({ status: 'failed', subtitle: '2 failed, 1 error' })
    expect(getChecksTabStatus(counts(5, 0, 2, 0))).toEqual({ status: 'failed', subtitle: '2 errors' })
  })

  it('should say how many checks passed, with a warning if some were skipped', () => {
    expect(getChecksTabStatus(counts(3, 0, 0, 0))).toEqual({ status: 'passed', subtitle: '3 passed' })
    expect(getChecksTabStatus(counts(3, 0, 0, 1))).toEqual({ status: 'warning', subtitle: '3 passed, 1 skipped' })
  })
})

describe('getComparisonTabStatus', () => {
  it('should say "all clear" when there are no diffs or skipped scenarios', () => {
    expect(getComparisonTabStatus({ count: 0, kind: 'scenario' }, 0)).toEqual({
      status: 'passed',
      subtitle: 'all clear'
    })
  })

  it('should warn about skipped scenarios when there are no diffs', () => {
    expect(getComparisonTabStatus({ count: 0, kind: 'scenario' }, 1)).toEqual({
      status: 'warning',
      subtitle: 'no diffs, but 1 skipped scenario'
    })
    expect(getComparisonTabStatus({ count: 0, kind: 'dataset' }, 2)).toEqual({
      status: 'warning',
      subtitle: 'no diffs, but 2 skipped scenarios'
    })
  })

  it('should say how many items have diffs', () => {
    expect(getComparisonTabStatus({ count: 1, kind: 'scenario' }, 0)).toEqual({
      status: 'warning',
      subtitle: '1 scenario with diffs'
    })
    expect(getComparisonTabStatus({ count: 3, kind: 'dataset' }, 1)).toEqual({
      status: 'warning',
      subtitle: '3 datasets with diffs'
    })
  })
})

describe('countComparisonGroupsWithDiffs', () => {
  it('should count the groups that are not in the "without diffs" category', () => {
    const group = (key: string) => ({ key }) as unknown as ComparisonGroupSummary
    const groups = {
      allGroupSummaries: new Map([
        ['1', group('1')],
        ['2', group('2')],
        ['3', group('3')]
      ]),
      withErrors: [],
      onlyInLeft: [],
      onlyInRight: [],
      withDiffs: [group('1'), group('2')],
      withoutDiffs: [group('3')]
    } as ComparisonGroupSummariesByCategory
    expect(countComparisonGroupsWithDiffs(groups)).toBe(2)
    expect(countComparisonGroupsWithDiffs({ ...groups, withoutDiffs: undefined })).toBe(3)
  })
})

describe('getComparisonViewsTabDiffCount', () => {
  const scenario = comparisonAllAtPos('1', 'at-default')
  const graphsView = viewWithScenario('Graphs', undefined, scenario, ['1', '2'], 'grouped-by-diffs')
  const defaultView = viewWithScenario('Default', undefined, scenario, ['1'])
  const group = viewGroup('Group', [graphsView, defaultView])

  it('should count the changed graphs in the views that show graphs grouped by diffs', () => {
    const summaries: ComparisonViewGroupSummary[] = [
      {
        viewGroup: group,
        viewSummaries: [
          { view: graphsView, changedGraphCount: 2, hasDiffs: true },
          { view: graphsView, changedGraphCount: 1, hasDiffs: true },
          { view: defaultView, changedGraphCount: 5, hasDiffs: true }
        ]
      }
    ]
    expect(getComparisonViewsTabDiffCount(summaries)).toEqual({ count: 3, kind: 'graph' })
  })

  it('should count the views with diffs when no graphs changed', () => {
    const summaries: ComparisonViewGroupSummary[] = [
      {
        viewGroup: group,
        viewSummaries: [
          { view: graphsView, changedGraphCount: 0, hasDiffs: false },
          { view: defaultView, hasDiffs: true }
        ]
      },
      {
        viewGroup: group,
        viewSummaries: [{ view: { kind: 'unresolved-view' }, hasDiffs: true }]
      }
    ]
    expect(getComparisonViewsTabDiffCount(summaries)).toEqual({ count: 2, kind: 'view' })
  })
})
