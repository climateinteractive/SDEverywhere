import type { InputCallbacks, InputValue } from '@sdeverywhere/runtime'
import type { InputSpec, SliderSpec, SwitchSpec } from '../config/generated/spec-types'

/**
 * Represents a slider (range) input to the model.
 */
export interface SliderInput extends InputValue {
  kind: 'slider'
  /** The spec that describes how the slider can be displayed in a user interface. */
  spec: SliderSpec
}

/**
 * Represents a switch (on/off) input to the model.
 */
export interface SwitchInput extends InputValue {
  kind: 'switch'
  /** The spec that describes how the switch can be displayed in a user interface. */
  spec: SwitchSpec
}

/**
 * Represents an input to the model.
 */
export type Input = SliderInput | SwitchInput

/**
 * Create an `Input` instance that can be used by the `Model` class.
 * When the input value is changed, it will cause the scheduler to
 * automatically run the model and produce new outputs.
 *
 * @param spec The spec for the slider or switch input.
 */
export function createModelInput(spec: InputSpec): Input {
  let currentValue = spec.defaultValue

  // The `onSet` callback is initially undefined but will be installed by the scheduler
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
    set(spec.defaultValue)
  }

  switch (spec.kind) {
    case 'slider':
      return { kind: 'slider', varId: spec.varId, spec, get, set, reset, callbacks }
    case 'switch':
      return { kind: 'switch', varId: spec.varId, spec, get, set, reset, callbacks }
    default:
      throw new Error(`Unhandled spec kind`)
  }
}
