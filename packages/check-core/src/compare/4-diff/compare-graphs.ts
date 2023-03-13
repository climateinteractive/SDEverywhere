// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey, ScenarioKey } from '../../_shared/types'
import type { BundleGraphSpec } from '../../bundle/bundle-types'
import type { CompareDatasetSummary } from './compare-summary'

export type GraphInclusion = 'neither' | 'left-only' | 'right-only' | 'both'

export interface GraphMetadataReport {
  /** The key for the metadata field. */
  key: string
  /** The value of the metadata field in the left bundle. */
  valueL?: string
  /** The value of the metadata field in the right bundle. */
  valueR?: string
}

export interface GraphDatasetReport {
  /** The dataset key. */
  datasetKey: DatasetKey
  /** The max diff for this dataset. */
  maxDiff?: number
}

export interface GraphReport {
  /** Indicates which bundles the graph is defined in. */
  inclusion: GraphInclusion
  /** The metadata fields with differences. */
  metadataReports: GraphMetadataReport[]
  /** The datasets with differences. */
  datasetReports: GraphDatasetReport[]
}

/**
 * Compare the metadata and datasets for the given graphs.
 *
 * @param graphL The graph defined in the left bundle.
 * @param graphR The graph defined in the right bundle.
 * @param scenarioKey The scenario used for comparing datasets.
 * @param datasetSummaries The set of summaries from a previous comparison run.
 */
export function diffGraphs(
  graphL: BundleGraphSpec | undefined,
  graphR: BundleGraphSpec | undefined,
  scenarioKey: ScenarioKey,
  datasetSummaries: CompareDatasetSummary[]
): GraphReport {
  // Check in which bundles the graph is defined
  let inclusion: GraphInclusion
  if (graphL && graphR) {
    inclusion = 'both'
  } else if (graphL) {
    inclusion = 'left-only'
  } else if (graphR) {
    inclusion = 'right-only'
  } else {
    inclusion = 'neither'
  }

  // Compare the metadata for the two graphs
  const metadataReports: GraphMetadataReport[] = []
  if (graphL?.metadata && graphR?.metadata) {
    const metaKeys: Set<string> = new Set()
    for (const key of graphL.metadata.keys()) {
      metaKeys.add(key)
    }
    for (const key of graphR.metadata.keys()) {
      metaKeys.add(key)
    }
    for (const key of metaKeys) {
      const valueL = graphL.metadata.get(key)
      const valueR = graphR.metadata.get(key)
      if (valueL !== valueR) {
        // Add a report only if the values are different for this key
        metadataReports.push({
          key,
          valueL,
          valueR
        })
      }
    }
  }

  // Compare the datasets for the two graphs
  const datasetReports: GraphDatasetReport[] = []
  if (graphL && graphR) {
    const datasetKeys: Set<DatasetKey> = new Set()
    for (const dataset of graphL.datasets) {
      datasetKeys.add(dataset.datasetKey)
    }
    for (const dataset of graphR.datasets) {
      datasetKeys.add(dataset.datasetKey)
    }
    for (const datasetKey of datasetKeys) {
      const summary = datasetSummaries.find(summary => summary.d === datasetKey && summary.s === scenarioKey)
      // TODO: Flag as an error if we don't have a CompareDatasetSummary
      // for the datasets?
      const maxDiff = summary !== undefined ? summary.md : undefined
      datasetReports.push({
        datasetKey,
        maxDiff
      })
    }
  }

  return {
    inclusion,
    metadataReports,
    datasetReports
  }
}
