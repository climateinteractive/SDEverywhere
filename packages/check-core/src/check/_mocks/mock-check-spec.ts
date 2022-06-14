// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { CheckDatasetSpec } from '../check-spec'

export function datasetNameSpec(name: string, source?: string): CheckDatasetSpec {
  return {
    name,
    source
  }
}

export function datasetGroupSpec(group: string): CheckDatasetSpec {
  return {
    group
  }
}

export function datasetMatchingTypeSpec(type: string): CheckDatasetSpec {
  return {
    matching: {
      type
    }
  }
}
