// Copyright (c) 2025 Climate Interactive / New Venture Fund

import {
  createFilterPanelViewModel,
  type FilterItem,
  type FilterPanelViewModel,
  type FilterState
} from './filter-panel-vm.svelte'

export class FilterPopoverViewModel {
  constructor(
    public readonly checksPanel: FilterPanelViewModel,
    public readonly comparisonScenariosPanel: FilterPanelViewModel
  ) {}
}

export function createFilterPopoverViewModel(
  checkItems: FilterItem[],
  checkState: FilterState,
  scenarioItems: FilterItem[],
  scenarioState: FilterState
): FilterPopoverViewModel {
  const checksPanel = createFilterPanelViewModel(checkItems, checkState)
  const comparisonScenariosPanel = createFilterPanelViewModel(scenarioItems, scenarioState)
  return new FilterPopoverViewModel(checksPanel, comparisonScenariosPanel)
}
