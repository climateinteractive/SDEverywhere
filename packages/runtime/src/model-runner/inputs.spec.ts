// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { createInputValue } from './inputs'

describe('createInputValue', () => {
  it('should return an InputValue with the correct properties', () => {
    const inputValue = createInputValue('_input1', 10, 20)
    expect(inputValue.varId).toBe('_input1')
    expect(inputValue.get()).toBe(20)

    let onSetCalled = false
    inputValue.callbacks.onSet = () => {
      onSetCalled = true
    }

    inputValue.set(50)
    expect(onSetCalled).toBe(true)
    expect(inputValue.get()).toBe(50)

    onSetCalled = false
    inputValue.set(50)
    expect(onSetCalled).toBe(false)
    expect(inputValue.get()).toBe(50)

    onSetCalled = false
    inputValue.reset()
    expect(onSetCalled).toBe(true)
    expect(inputValue.get()).toBe(10)
  })

  it('should use the default value when no initial value is provided', () => {
    const inputValue = createInputValue('_input1', 10)
    expect(inputValue.varId).toBe('_input1')
    expect(inputValue.get()).toBe(10)
  })
})
