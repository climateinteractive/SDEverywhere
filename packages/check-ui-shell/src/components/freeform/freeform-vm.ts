// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { writable, type Readable, type Writable } from 'svelte/store'

import type {
  ComparisonConfig,
  ComparisonDataCoordinator,
  ComparisonScenario,
  DatasetKey
} from '@sdeverywhere/check-core'

import { FreeformItemViewModel } from './freeform-item-vm'

export class FreeformViewModel {
  private readonly writableItems: Writable<FreeformItemViewModel[]>
  public readonly items: Readable<FreeformItemViewModel[]>

  constructor(comparisonConfig: ComparisonConfig, dataCoordinator: ComparisonDataCoordinator) {
    // config.comparison.bundleL.model, config.comparison.bundleR.model

    // XXX
    const scenarios = [...comparisonConfig.scenarios.getAllScenarios()]
    console.log(comparisonConfig)

    function allAtDefault(): ComparisonScenario {
      return scenarios[0]
      // const spec: ComparisonScenarioSpec = {
      //   kind: 'scenario-with-all-inputs',
      //   id: 'baseline',
      //   title: 'All inputs',
      //   subtitle: 'at default',
      //   position: 'default'
      // }
    }

    function item(): FreeformItemViewModel {
      const scenario = allAtDefault()
      const datasetKey: DatasetKey = 'Model__output_x'
      return new FreeformItemViewModel(comparisonConfig, dataCoordinator, 'TITLE', 'SUBTITLE', scenario, datasetKey)
    }

    this.writableItems = writable([item(), item(), item()])
    this.items = this.writableItems
  }
}

export function createFreeformViewModel(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator
): FreeformViewModel {
  return new FreeformViewModel(comparisonConfig, dataCoordinator)
}
