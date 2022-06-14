// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { derived, writable } from 'svelte/store'

import { SelectorOptionViewModel, SelectorViewModel } from '../_shared/selector-vm'

export interface WizardCardPredicatesViewModel {
  opSelector: SelectorViewModel
  selectedOpLabel: Readable<string>
  constantValue: Writable<number>
  timeStart: Writable<number>
  timeEnd: Writable<number>
}

export function createPredicatesCardViewModel(): WizardCardPredicatesViewModel {
  const opOptions: SelectorOptionViewModel[] = []
  opOptions.push(new SelectorOptionViewModel('equal to', 'eq'))
  opOptions.push(new SelectorOptionViewModel('approximately equal to', 'approx'))
  opOptions.push(new SelectorOptionViewModel('greater than', 'gt'))
  opOptions.push(new SelectorOptionViewModel('greater than or equal to', 'gte'))
  opOptions.push(new SelectorOptionViewModel('less than', 'lt'))
  opOptions.push(new SelectorOptionViewModel('less than or equal to', 'lte'))

  const selectedOpValue = writable('eq')
  const opSelector = new SelectorViewModel(opOptions, selectedOpValue)

  const selectedOpLabel = derived(selectedOpValue, $value => {
    return opOptions.find(option => option.value === $value).label
  })

  return {
    opSelector,
    selectedOpLabel,
    constantValue: writable(0),
    timeStart: writable(1850),
    timeEnd: writable(2100)
  }
}
