// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'

import type { DatasetKey } from '@sdeverywhere/check-core'

import type { CompareDetailBoxViewModel } from './compare-detail-box-vm'

export interface CompareGraphsDatasetViewModel {
  datasetKey: DatasetKey
  nameL?: string
  nameR?: string
  legendColorL?: string
  legendColorR?: string
  legendLabelL?: string
  legendLabelR?: string
  bucketClass: string
  maxDiff: number
  detailBoxViewModel: CompareDetailBoxViewModel
  detailBoxVisible: Writable<boolean>
}
