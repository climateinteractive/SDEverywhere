// Copyright (c) 2022 Climate Interactive / New Venture Fund

/** View model for an item in a list control. */
export class ListItemViewModel {
  /**
   * @param id The ID for the item.
   * @param label The displayed string.
   */
  constructor(public readonly id: string, public readonly label: string) {}
}
