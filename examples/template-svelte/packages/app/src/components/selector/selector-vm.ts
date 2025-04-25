import type { SyncWritable } from '../../model/stores'

export interface SelectorOption {
  value: string
  stringKey: string
}

export interface SelectorViewModel {
  options: SelectorOption[]
  selectedValue: SyncWritable<string>
}
