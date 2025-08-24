import type { Writable } from 'svelte/store'

/** View model for an option in a selector control. */
export class SelectorOptionViewModel {
  /**
   * @param label The displayed string.
   * @param value The value for the option.
   * @param disabled Whether the option is disabled.
   * @param hidden Whether the option is hidden when the popup menu
   * is visible (this is browser dependent; may not work in Safari).
   */
  constructor(
    public readonly label: string,
    public readonly value: string,
    public readonly disabled = false,
    public readonly hidden = false
  ) {}
}

/** View model for a dropdown/selector control. */
export class SelectorViewModel {
  /** Called when the user has changed the value. */
  public onUserChange?: (newValue: string) => void

  /**
   * @param options The options for the selector.
   * @param selectedValue The value of the selected option.
   * @param labelKey The key for the label (optional).
   */
  constructor(
    public readonly options: SelectorOptionViewModel[],
    public readonly selectedValue: Writable<string>,
    public readonly label?: string
  ) {}
}
