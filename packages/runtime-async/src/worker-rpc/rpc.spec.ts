// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it, vi } from 'vitest'

import type { WorkerPort } from './worker-port'
import { createRpcClient, serveRpcRequests, withTransfer } from './rpc'

/**
 * A `WorkerPort` implementation that records the messages that were posted and
 * delivers them to the handler installed on the port at the other end of the pair.
 */
interface MockPort extends WorkerPort {
  /** The messages that were posted on this port, in the order they were posted. */
  posted: { message: unknown; transferables?: Transferable[] }[]
  /** Deliver a message to the handler installed on this port. */
  deliver(message: unknown): void
  /** Deliver an error to the handler installed on this port. */
  fail(error: Error): void
  /** Report that this port has closed. */
  close(error: Error): void
  /** Install the handler that is called when this port closes. */
  onClose(handler: (error: Error) => void): void
}

/**
 * Create a pair of `MockPort` instances that are connected to each other, such that
 * a message posted on one port is delivered (asynchronously) to the other one.
 *
 * @returns A tuple containing the "near" (client side) and "far" (server side) ports.
 */
function createLinkedPorts(): [MockPort, MockPort] {
  function createPort(): MockPort {
    let messageHandler: (message: unknown) => void
    let errorHandler: (error: Error) => void
    let closeHandler: (error: Error) => void
    return {
      posted: [],
      postMessage(message: unknown, transferables?: Transferable[]) {
        this.posted.push({ message, transferables })
      },
      onMessage(handler: (message: unknown) => void) {
        messageHandler = handler
      },
      onError(handler: (error: Error) => void) {
        errorHandler = handler
      },
      onClose(handler: (error: Error) => void) {
        closeHandler = handler
      },
      deliver(message: unknown) {
        messageHandler?.(message)
      },
      fail(error: Error) {
        errorHandler?.(error)
      },
      close(error: Error) {
        closeHandler?.(error)
      }
    }
  }

  const near = createPort()
  const far = createPort()

  // Deliver each posted message to the other port on a later microtask, which more
  // closely mimics the asynchronous behavior of a real worker
  near.postMessage = function (message: unknown, transferables?: Transferable[]) {
    near.posted.push({ message, transferables })
    queueMicrotask(() => far.deliver(message))
  }
  far.postMessage = function (message: unknown, transferables?: Transferable[]) {
    far.posted.push({ message, transferables })
    queueMicrotask(() => near.deliver(message))
  }

  return [near, far]
}

describe('createRpcClient + serveRpcRequests', () => {
  it('should resolve a request with the value returned by the handler', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      double: (arg: number) => arg * 2
    })
    const client = createRpcClient(near)

    await expect(client.request('double', 21)).resolves.toBe(42)
  })

  it('should resolve a request with the value resolved by an async handler', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      greet: async (arg: string) => `hello ${arg}`
    })
    const client = createRpcClient(near)

    await expect(client.request('greet', 'world')).resolves.toBe('hello world')
  })

  it('should match responses to requests when responses arrive out of order', async () => {
    const [near, far] = createLinkedPorts()

    // Use a handler that defers the response for the first request until after the
    // second request has been handled
    let resolveFirst: (value: string) => void
    const firstResponse = new Promise<string>(resolve => (resolveFirst = resolve))
    serveRpcRequests(far, {
      slow: () => firstResponse,
      fast: () => 'fast-result'
    })
    const client = createRpcClient(near)

    const slowPromise = client.request('slow')
    const fastPromise = client.request('fast')

    await expect(fastPromise).resolves.toBe('fast-result')
    resolveFirst('slow-result')
    await expect(slowPromise).resolves.toBe('slow-result')
  })

  it('should reject a request when the handler throws an error', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      boom: () => {
        throw new Error('handler exploded')
      }
    })
    const client = createRpcClient(near)

    await expect(client.request('boom')).rejects.toThrow('handler exploded')
  })

  it('should reject a request when the handler rejects', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      boom: () => Promise.reject(new Error('async explosion'))
    })
    const client = createRpcClient(near)

    await expect(client.request('boom')).rejects.toThrow('async explosion')
  })

  it('should reject a request for an unknown method', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      known: () => 'ok'
    })
    const client = createRpcClient(near)

    await expect(client.request('unknown')).rejects.toThrow(`Unknown RPC method 'unknown'`)
  })

  it('should include the given transferables when posting a request', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      echo: (arg: unknown) => arg
    })
    const client = createRpcClient(near)

    const buffer = new ArrayBuffer(8)
    await client.request('echo', buffer, [buffer])

    expect(near.posted.length).toBe(1)
    expect(near.posted[0].transferables).toEqual([buffer])
  })

  it('should include the transferables declared by the handler when posting a response', async () => {
    const [near, far] = createLinkedPorts()
    const buffer = new ArrayBuffer(8)
    serveRpcRequests(far, {
      produce: () => withTransfer(buffer, [buffer])
    })
    const client = createRpcClient(near)

    await expect(client.request('produce')).resolves.toBe(buffer)

    expect(far.posted.length).toBe(1)
    expect(far.posted[0].transferables).toEqual([buffer])
  })

  it('should not include transferables when the handler returns a plain value', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      produce: () => 'plain'
    })
    const client = createRpcClient(near)

    await client.request('produce')

    expect(far.posted[0].transferables).toBeUndefined()
  })

  it('should reject pending requests when the client is disposed', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      never: () => new Promise(() => undefined)
    })
    const client = createRpcClient(near)

    const promise = client.request('never')
    client.dispose(new Error('runner was terminated'))

    await expect(promise).rejects.toThrow('runner was terminated')
  })

  it('should reject pending requests when the port reports an error', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      never: () => new Promise(() => undefined)
    })
    const client = createRpcClient(near)

    const promise = client.request('never')
    near.fail(new Error('worker died'))

    await expect(promise).rejects.toThrow('worker died')
  })

  it('should reject pending requests when the port closes', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      never: () => new Promise(() => undefined)
    })
    const client = createRpcClient(near)

    const promise = client.request('never')
    near.close(new Error('worker exited'))

    await expect(promise).rejects.toThrow('worker exited')
  })

  it('should reject later requests after the port reports an error', async () => {
    const [near] = createLinkedPorts()
    const client = createRpcClient(near)

    near.fail(new Error('worker died'))

    await expect(client.request('ping')).rejects.toThrow('worker died')
    expect(near.posted).toEqual([])
  })

  it('should ignore messages that are not RPC messages', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      ping: () => 'pong'
    })
    const client = createRpcClient(near)

    // Deliver some unrelated messages to both ends; these should be ignored without
    // throwing or disturbing an in-flight request
    near.deliver(undefined)
    near.deliver('some other message')
    near.deliver({ type: 'unrelated' })
    far.deliver({ type: 'unrelated' })

    await expect(client.request('ping')).resolves.toBe('pong')
  })

  it('should not deliver a response for a request that was already settled', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      ping: () => 'pong'
    })
    const client = createRpcClient(near)

    await expect(client.request('ping')).resolves.toBe('pong')

    // Re-deliver the same response message; this should be ignored
    const response = far.posted[0].message
    expect(() => near.deliver(response)).not.toThrow()
  })

  it('should stop handling requests after the client is disposed', async () => {
    const [near, far] = createLinkedPorts()
    serveRpcRequests(far, {
      ping: () => 'pong'
    })
    const client = createRpcClient(near)
    client.dispose(new Error('terminated'))

    await expect(client.request('ping')).rejects.toThrow('terminated')
  })
})

describe('withTransfer', () => {
  it('should wrap the given value and transferables', () => {
    const buffer = new ArrayBuffer(8)
    const wrapped = withTransfer(buffer, [buffer])
    expect(wrapped.value).toBe(buffer)
    expect(wrapped.transferables).toEqual([buffer])
  })
})

describe('serveRpcRequests', () => {
  it('should install a message handler on the given port', () => {
    const port: WorkerPort = {
      postMessage: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn()
    }
    serveRpcRequests(port, { ping: () => 'pong' })
    expect(port.onMessage).toHaveBeenCalledTimes(1)
  })
})
