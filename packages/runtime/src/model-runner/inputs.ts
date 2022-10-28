// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { InputVarId } from '../_shared'

/** Callback functions that are called when the input value is changed. */
export interface InputCallbacks {
  /** Called after a new value is set. */
  onSet?: () => void
}

/**
 * Represents a writable model input.
 */
export interface InputValue {
  /** The ID of the associated input variable, as used in SDEverywhere. */
  varId: InputVarId
  /** Get the current value of the input. */
  get: () => number
  /** Set the input to the given value. */
  set: (value: number) => void
  /** Reset the input to its default value. */
  reset: () => void
  /** Callback functions that are called when the input value is changed. */
  callbacks: InputCallbacks
}

/**
 * Create a basic `InputValue` instance that notifies when a new value is set.
 *
 * @param varId The input variable ID, as used in SDEverywhere.
 * @param defaultValue The default value of the input.
 * @param initialValue The inital value of the input; if undefined, will use `defaultValue`.
 */
export function createInputValue(varId: InputVarId, defaultValue: number, initialValue?: number): InputValue {
  let currentValue = initialValue !== undefined ? initialValue : defaultValue

  // The `onSet` callback is initially undefined but will be installed by `ModelScheduler`
  const callbacks: InputCallbacks = {}

  const get = () => {
    return currentValue
  }

  const set = (newValue: number) => {
    if (newValue !== currentValue) {
      currentValue = newValue
      callbacks.onSet?.()
    }
  }

  const reset = () => {
    set(defaultValue)
  }

  return { varId, get, set, reset, callbacks }
}
