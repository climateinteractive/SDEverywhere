// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createInputValue, Outputs, type InputValue } from '../_shared'
import type { ModelRunner } from '../model-runner'
import { ModelScheduler } from './model-scheduler'

describe('ModelScheduler', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // Note: this tests the behavior of the scheduler with real timers
  it('should run the model', async () => {
    const runner: ModelRunner = {
      createOutputs: () => {
        return new Outputs(['_output_1', '_output_2'], 2000, 2100, 1)
      },
      runModel: async (inputs, outputs) => {
        // TODO: Update this when we change ModelScheduler to pass number[] instead of InputValue[]
        const input1 = inputs[0] as InputValue
        const input2 = inputs[1] as InputValue
        outputs.getSeriesForVar('_output_1').points[0].y = input1.get()
        outputs.getSeriesForVar('_output_2').points[100].y = input2.get() * 2
        return outputs
      },
      terminate: async () => {
        // no-op
      }
    }

    const input1 = createInputValue('_input_1', 0)
    const input2 = createInputValue('_input_2', 0)
    const input3 = createInputValue('_input_3', 0)
    const inputs = [input1, input2, input3]
    const outputs = runner.createOutputs()

    const scheduler = new ModelScheduler(runner, inputs, outputs)

    input1.set(3)
    const outputs1: Outputs = await new Promise(resolve => {
      scheduler.onOutputsChanged = changedOutputs => {
        resolve(changedOutputs)
      }
    })
    expect(outputs1).toBeDefined()
    expect(outputs1.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(3)
    expect(outputs1.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(0)

    input1.set(5)
    input2.set(6)
    const outputs2: Outputs = await new Promise(resolve => {
      scheduler.onOutputsChanged = changedOutputs => {
        resolve(changedOutputs)
      }
    })
    expect(outputs2).toBeDefined()
    expect(outputs2.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(5)
    expect(outputs2.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(12)
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
            // TODO: Update this when we change ModelScheduler to pass number[] instead of InputValue[]
            const input1 = inputs[0] as InputValue
            const input2 = inputs[1] as InputValue
            outputs.getSeriesForVar('_output_1').points[0].y = input1.get()
            outputs.getSeriesForVar('_output_2').points[100].y = input2.get() * 2
            resolve(outputs)
          }, 20)
        })
      },
      terminate: async () => {
        // no-op
      }
    }

    const input1 = createInputValue('_input_1', 0)
    const input2 = createInputValue('_input_2', 0)
    const input3 = createInputValue('_input_3', 0)
    const inputs = [input1, input2, input3]
    const outputs = runner.createOutputs()

    // Enable the use of fake timers for this test
    vi.useFakeTimers()

    const scheduler = new ModelScheduler(runner, inputs, outputs)

    let changedOutputs: Outputs
    scheduler.onOutputsChanged = o => {
      changedOutputs = o
    }

    // Verify that `onOutputsChanged` has not been called yet
    expect(changedOutputs).toBeUndefined()

    // Set an input to cause a model run to be scheduled
    input1.set(3)
    expect(changedOutputs).toBeUndefined()

    // Move fake time forward enough to cause the model run to be scheduled,
    // but not enough for the model run to complete (which takes 20ms)
    vi.advanceTimersByTime(10)

    // Set the same input to a new value; this should not affect the current
    // model run already in progress (because the scheduler should have captured
    // the input value before the current model run), but it should cause
    // another model run to be scheduled after the current one finishes
    input1.set(5)
    input2.set(6)

    // Move fake time forward enough to cause the model run to complete
    vi.advanceTimersByTime(20)

    // Verify that `onOutputsChanged` is called after the first model run completed
    const outputs1: Outputs = await new Promise(resolve => {
      scheduler.onOutputsChanged = o => {
        resolve(o)
      }
    })
    expect(outputs1).toBeDefined()
    expect(outputs1.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(3)
    expect(outputs1.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(0)

    // Move fake time forward enough to cause the next run to complete
    vi.advanceTimersByTime(30)

    // Verify that `onOutputsChanged` is called after the second model run completed
    const outputs2: Outputs = await new Promise(resolve => {
      scheduler.onOutputsChanged = o => {
        resolve(o)
      }
    })
    expect(outputs2).toBeDefined()
    expect(outputs2.getSeriesForVar('_output_1').getValueAtTime(2000)).toBe(5)
    expect(outputs2.getSeriesForVar('_output_2').getValueAtTime(2100)).toBe(12)
  })
})
