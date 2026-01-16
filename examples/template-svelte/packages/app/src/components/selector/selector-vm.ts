import type { SyncWritable } from '@shared/stores'

export interface SelectorOption {
  value: string
  stringKey: string
}

export interface SelectorViewModel {
  /** The options for the selector. */
  options: SelectorOption[]
  /** The selected value. */
  selectedValue: SyncWritable<string>
  /** Called when the user has changed the value. */
  onUserChange?: (newValue: string) => void
}
