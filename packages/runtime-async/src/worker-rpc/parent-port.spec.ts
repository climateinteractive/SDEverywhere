// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it, vi } from 'vitest'

import { portForNodeParentPort, portForWorkerGlobalScope } from './parent-port'

describe('portForNodeParentPort', () => {
  /**
   * Create a minimal stand-in for the `parentPort` provided by `node:worker_threads`.
   *
   * @returns The mock parent port along with the listeners that were installed on it.
   */
  function createMockParentPort() {
    const listeners = new Map<string, (arg: unknown) => void>()
    return {
      listeners,
      parentPort: {
        postMessage: vi.fn(),
        on: (event: string, listener: (arg: unknown) => void) => {
          listeners.set(event, listener)
        }
      }
    }
  }

  it('should forward posted messages and transferables to the parent port', () => {
    const { parentPort } = createMockParentPort()
    const port = portForNodeParentPort(parentPort)

    const buffer = new ArrayBuffer(8)
    port.postMessage({ a: 1 }, [buffer])

    expect(parentPort.postMessage).toHaveBeenCalledWith({ a: 1 }, [buffer])
  })

  it('should omit the transfer list when no transferables are given', () => {
    const { parentPort } = createMockParentPort()
    const port = portForNodeParentPort(parentPort)

    port.postMessage({ a: 1 })

    expect(parentPort.postMessage).toHaveBeenCalledWith({ a: 1 }, [])
  })

  it('should deliver messages to the message handler', () => {
    const { parentPort, listeners } = createMockParentPort()
    const port = portForNodeParentPort(parentPort)

    const received: unknown[] = []
    port.onMessage(message => received.push(message))
    listeners.get('message')?.({ a: 1 })

    expect(received).toEqual([{ a: 1 }])
  })
})

describe('portForWorkerGlobalScope', () => {
  /**
   * Create a minimal stand-in for the global scope of a Web Worker.
   *
   * @returns The mock scope along with the listeners that were installed on it.
   */
  function createMockWorkerScope() {
    const listeners = new Map<string, (event: unknown) => void>()
    return {
      listeners,
      scope: {
        postMessage: vi.fn(),
        addEventListener: (type: string, listener: (event: unknown) => void) => {
          listeners.set(type, listener)
        }
      }
    }
  }

  it('should forward posted messages and transferables to the worker scope', () => {
    const { scope } = createMockWorkerScope()
    const port = portForWorkerGlobalScope(scope)

    const buffer = new ArrayBuffer(8)
    port.postMessage({ a: 1 }, [buffer])

    expect(scope.postMessage).toHaveBeenCalledWith({ a: 1 }, [buffer])
  })

  it('should omit the transfer list when no transferables are given', () => {
    const { scope } = createMockWorkerScope()
    const port = portForWorkerGlobalScope(scope)

    port.postMessage({ a: 1 })

    expect(scope.postMessage).toHaveBeenCalledWith({ a: 1 }, [])
  })

  it('should deliver the data from a message event to the message handler', () => {
    const { scope, listeners } = createMockWorkerScope()
    const port = portForWorkerGlobalScope(scope)

    const received: unknown[] = []
    port.onMessage(message => received.push(message))
    listeners.get('message')?.({ data: { a: 1 } })

    expect(received).toEqual([{ a: 1 }])
  })
})
