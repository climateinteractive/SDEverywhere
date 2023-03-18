// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { CompareDatasetSummary, DatasetKey } from '../..'
import type { BundleGraphDatasetSpec, BundleGraphSpec } from '../../bundle/bundle-types'
import type { CompareScenarioDefKey } from '../config/compare-scenarios'
import type { GraphDatasetReport, GraphMetadataReport } from './compare-diff-graphs'
import { diffGraphs } from './compare-diff-graphs'

const scenarioDefKey = 'all_inputs_at_default' as CompareScenarioDefKey

function dataset(key: string, varName: string, label: string, color: string): BundleGraphDatasetSpec {
  return {
    datasetKey: `Model_${key}`,
    varName,
    label,
    color
  }
}

function metadataReport(key: string, valueL: string | undefined, valueR: string | undefined): GraphMetadataReport {
  return {
    key,
    valueL,
    valueR
  }
}

function datasetReport(datasetKey: DatasetKey, maxDiff: number): GraphDatasetReport {
  return {
    datasetKey,
    maxDiff
  }
}

describe('diffGraphs', () => {
  it('should return a report for graph defined in only one bundle', () => {
    const graph: BundleGraphSpec = {
      id: '1',
      title: '',
      legendItems: [],
      datasets: [
        dataset('_coal_amount', 'Coal Amount', 'Coal', '#ff0000'),
        dataset('_oil_amount', 'Oil Amount', 'Oil', '#ffff00')
      ],
      metadata: new Map([])
    }

    const reportLeftOnly = diffGraphs(graph, undefined, scenarioDefKey, [])
    expect(reportLeftOnly.inclusion).toBe('left-only')

    const reportRightOnly = diffGraphs(undefined, graph, scenarioDefKey, [])
    expect(reportRightOnly.inclusion).toBe('right-only')

    const reportNeither = diffGraphs(undefined, undefined, scenarioDefKey, [])
    expect(reportNeither.inclusion).toBe('neither')
  })

  it('should return a report for two graphs with no differences', () => {
    const graphL: BundleGraphSpec = {
      id: '1',
      title: '',
      legendItems: [],
      datasets: [
        dataset('_coal_amount', 'Coal Amount', 'Coal', '#ff0000'),
        dataset('_oil_amount', 'Oil Amount', 'Oil', '#ffff00')
      ],
      metadata: new Map([['title', 'Graph 1']])
    }
    const graphR = graphL

    const report = diffGraphs(graphL, graphR, scenarioDefKey, [])
    expect(report.inclusion).toBe('both')
    expect(report.metadataReports).toEqual([])
  })

  it('should return a report for two graphs with metadata differences', () => {
    const graphL: BundleGraphSpec = {
      id: '1',
      title: '',
      legendItems: [],
      datasets: [
        dataset('_coal_amount', 'Coal Amount', 'Coal', '#ff0000'),
        dataset('_oil_amount', 'Oil Amount', 'Oil', '#ffff00')
      ],
      metadata: new Map([
        ['title', 'Graph 1'],
        ['menuTitle', 'Graph 1 Menu Title'],
        ['format', '.1f']
      ])
    }
    const graphR: BundleGraphSpec = {
      id: '1',
      title: '',
      legendItems: [],
      datasets: [
        dataset('_coal_amount', 'Coal Amount', 'Coal', '#ff0000'),
        dataset('_oil_amount', 'Oil Amount', 'Oil', '#ffff00')
      ],
      metadata: new Map([
        ['title', 'New Graph 1'],
        ['format', '.1f'],
        ['yMax', '2000']
      ])
    }

    const report = diffGraphs(graphL, graphR, scenarioDefKey, [])
    expect(report.inclusion).toBe('both')
    expect(report.metadataReports).toEqual([
      metadataReport('title', 'Graph 1', 'New Graph 1'),
      metadataReport('menuTitle', 'Graph 1 Menu Title', undefined),
      metadataReport('yMax', undefined, '2000')
    ])
  })

  it('should return a report for two graphs with dataset differences', () => {
    const graphL: BundleGraphSpec = {
      id: '1',
      title: '',
      legendItems: [],
      datasets: [
        dataset('_coal_amount', 'Coal Amount', 'Coal', '#ff0000'),
        dataset('_oil_amount', 'Oil Amount', 'Oil', '#ffff00')
      ],
      metadata: new Map([['title', 'Graph 1']])
    }
    const graphR: BundleGraphSpec = {
      id: '1',
      title: '',
      legendItems: [],
      datasets: [
        dataset('_coal_amount', 'Coal Amount', 'Coal', '#ff0000'),
        dataset('_oil_amount', 'Oil Amount', 'New Oil', '#00ff00')
      ],
      metadata: new Map([['title', 'Graph 1']])
    }
    const summaries: CompareDatasetSummary[] = [
      { d: 'Model__coal_amount', s: 'a_different_scenario' as CompareScenarioDefKey, md: 40 },
      { d: 'Model__coal_amount', s: scenarioDefKey, md: 50 },
      { d: 'Model__oil_amount', s: scenarioDefKey, md: 10 }
    ]

    const report = diffGraphs(graphL, graphR, scenarioDefKey, summaries)
    expect(report.inclusion).toBe('both')
    expect(report.metadataReports).toEqual([])
    expect(report.datasetReports).toEqual([
      datasetReport('Model__coal_amount', 50),
      datasetReport('Model__oil_amount', 10)
    ])
  })
})
