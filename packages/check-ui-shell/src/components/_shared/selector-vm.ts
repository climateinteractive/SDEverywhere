// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'

/** View model for an option in a selector control. */
export class SelectorOptionViewModel {
  /**
   * @param label The displayed string.
   * @param value The value for the option.
   * @param disabled Whether the option is disabled.
   */
  constructor(public readonly label: string, public readonly value: string, public readonly disabled = false) {}
}

/** View model for a dropdown/selector control. */
export class SelectorViewModel {
  /** Called when the user has changed the value. */
  public onUserChange?: (newValue: string) => void

  /**
   * @param options The options for the selector.
   * @param selectedValue The value of the selected option.
   * @param label The displayed string (optional).
   */
  constructor(
    public readonly options: SelectorOptionViewModel[],
    public readonly selectedValue: Writable<string>,
    public readonly label?: string
  ) {}
}
