// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createInputValue, Outputs, Series, type DataMap, type InputValue } from '../_shared'
import type { ModelRunner } from '../model-runner'
import { MultiContextModelScheduler, type ModelContext } from './multi-context-model-scheduler'

describe('MultiContextModelScheduler', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should have output values set to zero if no initial outputs are provided', async () => {
    const runner: ModelRunner = {
      createOutputs: () => {
        return new Outputs(['_output_1', '_output_2'], 2000, 2100, 1)
      },
      runModel: async (_, outputs) => {
        return outputs
      },
      terminate: async () => {
        // no-op
      }
    }

    const scheduler = new MultiContextModelScheduler(runner)
    const inputs1 = createContextInputs()
    const context1 = scheduler.addContext(inputs1.inputs)
    expect(context1.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(0)
    expect(context1.getSeriesForVar('_output_2').getValueAtTime(2000)).toBe(0)
  })

  it('should have output values set to the initial outputs when provided', async () => {
    const initialOutputs = new Outputs(['_output_1', '_output_2'], 2000, 2100, 1)
    initialOutputs.getSeriesForVar('_output_1').points[0].y = 1
    initialOutputs.getSeriesForVar('_output_2').points[0].y = 2
    const runner: ModelRunner = {
      createOutputs: () => {
        return new Outputs(['_output_1', '_output_2'], 2000, 2100, 1)
      },
      runModel: async (_, outputs) => {
        return outputs
      },
      terminate: async () => {
        // no-op
      }
    }

    const scheduler = new MultiContextModelScheduler(runner, { initialOutputs })
    const inputs1 = createContextInputs()
    const context1 = scheduler.addContext(inputs1.inputs)
    expect(context1.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(1)
    expect(context1.getSeriesForVar('_output_2').getValueAtTime(2000)).toBe(2)
  })

  // Note: this tests the behavior of the scheduler with real timers
  it('should run the model when there are multiple contexts', async () => {
    const runner: ModelRunner = {
      createOutputs: () => {
        return new Outputs(['_output_1', '_output_2'], 2000, 2100, 1)
      },
      runModel: async (inputs, outputs) => {
        const inputNumbers = inputs as number[]
        outputs.getSeriesForVar('_output_1').points[0].y = inputNumbers[0]
        outputs.getSeriesForVar('_output_2').points[100].y = inputNumbers[1] * 2
        return outputs
      },
      terminate: async () => {
        // no-op
      }
    }

    const externalData: DataMap = new Map()
    function refSeries(varId: string, value: number): Series {
      const points = Array.from({ length: 101 }, (_, i) => ({ x: 2000 + i, y: value }))
      return new Series(varId, points)
    }
    externalData.set(
      'Ref',
      new Map([
        ['_output_1', refSeries('_output_1', 1)],
        ['_output_2', refSeries('_output_2', 2)]
      ])
    )

    const scheduler = new MultiContextModelScheduler(runner)

    const inputs1 = createContextInputs()
    const context1 = scheduler.addContext(inputs1.inputs, { externalData })

    const inputs2 = createContextInputs()
    const context2 = scheduler.addContext(inputs2.inputs, { externalData })

    inputs1.input1.set(3)
    await contextOutputsChanged(context1)
    expect(context1.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(3)
    expect(context1.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(0)
    expect(context2.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(0)
    expect(context2.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(0)

    inputs1.input1.set(5)
    inputs1.input2.set(6)
    inputs2.input2.set(8)
    await Promise.all([contextOutputsChanged(context1), contextOutputsChanged(context2)])
    expect(context1.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(5)
    expect(context1.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(12)
    expect(context2.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(0)
    expect(context2.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(16)

    // Verify that external data is available from both contexts
    expect(context1.getSeriesForVar('_output_1', 'Ref').getValueAtTime(2000)).toBe(1)
    expect(context1.getSeriesForVar('_output_2', 'Ref').getValueAtTime(2000)).toBe(2)
    expect(context2.getSeriesForVar('_output_1', 'Ref').getValueAtTime(2000)).toBe(1)
    expect(context2.getSeriesForVar('_output_2', 'Ref').getValueAtTime(2000)).toBe(2)
  })

  // Note: this tests the behavior of the scheduler with fake timers
  it('should enqueue another run if the inputs are changed while current run is in progress', async () => {
    const runner: ModelRunner = {
      createOutputs: () => {
        return new Outputs(['_output_1', '_output_2'], 2000, 2100, 1)
      },
      runModel: (inputs, outputs) => {
        // For this runModel implementation, use setTimeout so that we have control
        // over timing (pretend that the model takes 20ms to run)
        return new Promise(resolve => {
          setTimeout(() => {
            const inputNumbers = inputs as number[]
            outputs.getSeriesForVar('_output_1').points[0].y = inputNumbers[0]
            outputs.getSeriesForVar('_output_2').points[100].y = inputNumbers[1] * 2
            resolve(outputs)
          }, 20)
        })
      },
      terminate: async () => {
        // no-op
      }
    }

    // Enable the use of fake timers for this test
    vi.useFakeTimers()

    const scheduler = new MultiContextModelScheduler(runner)

    const inputs1 = createContextInputs()
    const context1 = scheduler.addContext(inputs1.inputs)

    let onOutputsChangedCalled = false
    context1.onOutputsChanged = () => {
      onOutputsChangedCalled = true
    }

    // Verify that `onOutputsChanged` has not been called yet
    expect(onOutputsChangedCalled).toBe(false)

    // Set an input to cause a model run to be scheduled
    inputs1.input1.set(3)
    expect(onOutputsChangedCalled).toBe(false)

    // Move fake time forward enough to cause the model run to be scheduled,
    // but not enough for the model run to complete (which takes 20ms)
    await vi.advanceTimersByTimeAsync(10)
    expect(onOutputsChangedCalled).toBe(false)

    // Set the same input to a new value; this should not affect the current
    // model run already in progress (because the scheduler should have captured
    // the input value before the current model run), but it should cause
    // another model run to be scheduled after the current one finishes
    inputs1.input1.set(5)
    inputs1.input2.set(6)

    // Move fake time forward enough to cause the first model run to complete
    await vi.advanceTimersByTimeAsync(20)

    // Verify that `onOutputsChanged` is called after the first model run completed
    expect(onOutputsChangedCalled).toBe(true)
    expect(context1.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(3)
    expect(context1.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(0)

    // Clear the flag
    onOutputsChangedCalled = false

    // Move fake time forward enough to cause the next run to complete
    await vi.advanceTimersByTimeAsync(30)
    expect(onOutputsChangedCalled).toBe(true)

    // Verify that `onOutputsChanged` is called after the second model run completed
    expect(context1.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(5)
    expect(context1.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(12)
  })
})

interface ContextInputs {
  input1: InputValue
  input2: InputValue
  input3: InputValue
  inputs: InputValue[]
}

function createContextInputs(): ContextInputs {
  const input1 = createInputValue('_input_1', 0)
  const input2 = createInputValue('_input_2', 0)
  const input3 = createInputValue('_input_3', 0)
  return { input1, input2, input3, inputs: [input1, input2, input3] }
}

function contextOutputsChanged(context: ModelContext): Promise<void> {
  return new Promise(resolve => {
    context.onOutputsChanged = () => {
      resolve(undefined)
    }
  })
}
