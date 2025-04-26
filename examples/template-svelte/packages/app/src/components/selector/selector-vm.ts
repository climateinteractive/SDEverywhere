import type { SyncWritable } from '@shared/stores'

export interface SelectorOption {
  value: string
  stringKey: string
}

export interface SelectorViewModel {
  options: SelectorOption[]
  selectedValue: SyncWritable<string>
}
