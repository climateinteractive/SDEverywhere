// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

import { derived, type Readable } from 'svelte/store'

import type {
  BundleGraphSpec,
  ComparisonConfig,
  ComparisonDataCoordinator,
  ComparisonScenario
} from '@sdeverywhere/check-core'

import type { UserPrefs } from '../../../_shared/user-prefs'

import { ContextGraphViewModel } from '../../graphs/context-graph-vm'

import type { PinnedItemKey } from '../_shared/pinned-item-state'

import { CompareDetailBoxViewModel, type AxisRange } from './compare-detail-box-vm'
import type { ComparisonDetailItem } from './compare-detail-item'

export interface CompareDetailContextGraphRowViewModel {
  graphL: ContextGraphViewModel
  graphR: ContextGraphViewModel
}

export type CompareDetailRowKind = 'scenarios' | 'datasets' | 'freeform'

export interface CompareDetailRowViewModel {
  kind: CompareDetailRowKind
  title?: string
  subtitle?: string
  showTitle: boolean
  items: ComparisonDetailItem[]
  boxes: CompareDetailBoxViewModel[]
  pinnedItemKey: string
}

export function createCompareDetailRowViewModel(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  userPrefs: UserPrefs,
  kind: CompareDetailRowKind,
  title: string | undefined,
  subtitle: string | undefined,
  items: ComparisonDetailItem[]
): CompareDetailRowViewModel {
  const boxes: CompareDetailBoxViewModel[] = []

  for (const item of items) {
    // If a scenario wasn't run for this position, add an undefined box view model
    // (the space will be left blank)
    if (item === undefined) {
      boxes.push(undefined)
      continue
    }

    // Determine which title/subtitle to show above the box based on the row kind
    let boxTitle: string
    let boxSubtitle: string
    switch (kind) {
      case 'scenarios':
        boxTitle = `…${item.subtitle}`
        break
      case 'datasets':
        boxTitle = item.title
        break
      case 'freeform':
        boxTitle = item.title
        boxSubtitle = item.subtitle
        break
      default:
        assertNever(kind)
    }

    // Determine which key to use as the pinned item key.  Currently,
    // individual boxes in a freeform row cannot be pinned, so we use
    // undefined in that case.
    let pinnedItemKey: PinnedItemKey
    switch (kind) {
      case 'scenarios':
        pinnedItemKey = item.scenario.key
        break
      case 'datasets':
        pinnedItemKey = item.testSummary.d
        break
      case 'freeform':
        pinnedItemKey = undefined
        break
      default:
        assertNever(kind)
    }

    boxes.push(
      new CompareDetailBoxViewModel(
        comparisonConfig,
        dataCoordinator,
        boxTitle,
        boxSubtitle,
        item.scenario,
        item.testSummary.d,
        pinnedItemKey
      )
    )
  }

  // This resolves the overall min and max values for all boxes; this will be updated
  // asynchronously (N times for a row of N boxes) as the data is loaded for each box
  const yRangeForRow: Readable<AxisRange> = derived(
    boxes.map(b => b.yRange),
    yRanges => {
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      for (const range of yRanges) {
        if (range?.min < min) {
          min = range.min
        }
        if (range?.max > max) {
          max = range.max
        }
      }
      return {
        min,
        max
      }
    }
  )

  // This resolves to either `yRangeForRow` or undefined, depending on whether the
  // user has the "Consistent Y-Axis Range" checkbox enabled
  const activeYRangeForRow: Readable<AxisRange | undefined> = derived(
    [userPrefs.consistentYRange, yRangeForRow],
    ([$enabled, $yRange]) => {
      return $enabled ? $yRange : undefined
    }
  )

  // Update the boxes to use the active y-axis range values
  // TODO: Unsubscribe when the component is unmounted
  activeYRangeForRow.subscribe(yRange => {
    for (const box of boxes) {
      box.updateYAxisRange(yRange)
    }
  })

  // Derive the key for the row from the individual box keys
  const boxKeys = boxes.map(box => box.pinnedItemKey)
  const pinnedItemKey = `row_${boxKeys.join('_')}`

  return {
    kind,
    title,
    subtitle,
    showTitle: kind !== 'datasets',
    items,
    boxes,
    pinnedItemKey
  }
}

export function createContextGraphRows(box: CompareDetailBoxViewModel): CompareDetailContextGraphRowViewModel[] {
  const comparisonConfig = box.comparisonConfig
  const dataCoordinator = box.dataCoordinator
  const bundleModelL = dataCoordinator.bundleModelL
  const bundleModelR = dataCoordinator.bundleModelR

  function contextGraph(
    scenario: ComparisonScenario,
    graphSpec: BundleGraphSpec | undefined,
    bundle: 'left' | 'right'
  ): ContextGraphViewModel {
    return new ContextGraphViewModel(comparisonConfig, dataCoordinator, bundle, scenario, graphSpec)
  }

  // Get the context graphs that are related to this output variable
  const graphIds = comparisonConfig.datasets.getContextGraphIdsForDataset(box.datasetKey, box.scenario)

  // Prepare context graphs for this box
  const contextGraphRows: CompareDetailContextGraphRowViewModel[] = []
  for (const graphId of graphIds) {
    const graphSpecL = bundleModelL.modelSpec.graphSpecs?.find(s => s.id === graphId)
    const graphSpecR = bundleModelR.modelSpec.graphSpecs?.find(s => s.id === graphId)
    contextGraphRows.push({
      graphL: contextGraph(box.scenario, graphSpecL, 'left'),
      graphR: contextGraph(box.scenario, graphSpecR, 'right')
    })
  }

  return contextGraphRows
}
