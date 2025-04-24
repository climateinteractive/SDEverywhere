import { writable } from 'svelte/store'
import type { InputCallbacks, InputSpec, SliderInput, SwitchInput } from '@core'
import type { SyncWritable } from './stores'

/**
 * Represents a writable slider (range) input to the model.  This is a
 * convenience type that combines the `SliderInput` interface with the
 * `SyncWritable` type so that the input wrapper can be used as a Svelte
 * store.
 */
export interface WritableSliderInput extends SliderInput, SyncWritable<number> {}

/**
 * Represents a writable switch (on/off) input to the model.  This is a
 * convenience type that combines the `SwitchInput` interface with the
 * `SyncWritable` type so that the input wrapper can be used as a Svelte
 * store.
 */
export interface WritableSwitchInput extends SwitchInput, SyncWritable<number> {}

/**
 * Represents a writable model input to the model.
 */
export type WritableInput = WritableSliderInput | WritableSwitchInput

/**
 * Create a new `WritableInput` instance for the given input spec.
 *
 * @param spec The spec for the slider or switch input.
 */
export function createWritableModelInput(spec: InputSpec): WritableInput {
  const varId = spec.varId
  const initialValue = spec.defaultValue
  let currentValue = initialValue
  const { subscribe, set } = writable(initialValue)

  // The `onSet` callback is initially undefined but will be installed by `ModelScheduler`
  const callbacks: InputCallbacks = {}

  const get = () => {
    return currentValue
  }

  const _set = (newValue: number) => {
    if (newValue !== currentValue) {
      currentValue = newValue
      set(newValue)
      callbacks.onSet?.()
    }
  }

  const _update = (updater: (value: number) => number) => {
    _set(updater(currentValue))
  }

  const reset = () => {
    _set(initialValue)
  }

  switch (spec.kind) {
    case 'slider':
      return {
        kind: 'slider',
        spec,
        varId,
        subscribe,
        get,
        set: _set,
        update: _update,
        reset,
        callbacks
      }
    case 'switch':
      return {
        kind: 'switch',
        spec,
        varId,
        subscribe,
        get,
        set: _set,
        update: _update,
        reset,
        callbacks
      }
    default:
      throw new Error(`Unhandled spec kind`)
  }
}
