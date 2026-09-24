// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it, vi } from 'vitest'

import { createModelWorkerClient, serveModelWorker } from './model-worker-rpc'
import type { WorkerHandle } from './worker-port'

/** A worker handle that can be connected to another mock port. */
interface MockPort extends WorkerHandle {
  /** The messages posted through this port. */
  posted: { message: unknown; transferables?: Transferable[] }[]
  /** Deliver a message to this port. */
  deliver(message: unknown): void
  /** Deliver an error to this port. */
  fail(error: Error): void
  /** Report that this port has closed. */
  close(error: Error): void
}

/**
 * Create two connected mock worker ports.
 *
 * @returns The client-side and worker-side ports.
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
      },
      terminate() {
        return Promise.resolve()
      }
    }
  }

  const clientPort = createPort()
  const workerPort = createPort()
  clientPort.postMessage = function (message: unknown, transferables?: Transferable[]) {
    clientPort.posted.push({ message, transferables })
    queueMicrotask(() => workerPort.deliver(message))
  }
  workerPort.postMessage = function (message: unknown, transferables?: Transferable[]) {
    workerPort.posted.push({ message, transferables })
    queueMicrotask(() => clientPort.deliver(message))
  }
  return [clientPort, workerPort]
}

/** Return representative metadata produced when a model is initialized. */
function initResult() {
  return {
    outputVarIds: ['_output'],
    startTime: 2000,
    endTime: 2002,
    saveFreq: 1
  }
}

describe('model worker protocol', () => {
  it('should initialize the model and return its metadata', async () => {
    const [clientPort, workerPort] = createLinkedPorts()
    serveModelWorker(workerPort, {
      initModel: () => initResult(),
      runModel: buffer => buffer
    })
    const client = createModelWorkerClient(clientPort)

    await expect(client.initModel()).resolves.toEqual(initResult())
    expect(clientPort.posted[0]).toEqual({ message: { kind: 'init' }, transferables: undefined })
  })

  it('should pass the init arguments to the worker without transferring them', async () => {
    const [clientPort, workerPort] = createLinkedPorts()
    const initModel = vi.fn(() => initResult())
    serveModelWorker(workerPort, {
      initModel,
      runModel: buffer => buffer
    })
    const client = createModelWorkerClient(clientPort)
    const wasmBinary = new ArrayBuffer(8)
    const initArgs = { wasmBinary }

    await expect(client.initModel(initArgs)).resolves.toEqual(initResult())
    expect(clientPort.posted[0]).toEqual({ message: { kind: 'init', args: initArgs }, transferables: undefined })
    expect(initModel).toHaveBeenCalledWith(initArgs)
  })

  it('should run the model and transfer the buffer in both directions', async () => {
    const [clientPort, workerPort] = createLinkedPorts()
    serveModelWorker(workerPort, {
      initModel: () => initResult(),
      runModel: buffer => buffer
    })
    const client = createModelWorkerClient(clientPort)
    const buffer = new ArrayBuffer(8)

    await expect(client.runModel(buffer)).resolves.toBe(buffer)
    expect(clientPort.posted[0].transferables).toEqual([buffer])
    expect(workerPort.posted[0].transferables).toEqual([buffer])
  })

  it('should reject when a worker method throws', async () => {
    const [clientPort, workerPort] = createLinkedPorts()
    serveModelWorker(workerPort, {
      initModel: () => {
        throw new Error('initialization failed')
      },
      runModel: buffer => buffer
    })
    const client = createModelWorkerClient(clientPort)

    await expect(client.initModel()).rejects.toThrow('initialization failed')
  })

  it('should reject when an asynchronous worker method rejects', async () => {
    const [clientPort, workerPort] = createLinkedPorts()
    serveModelWorker(workerPort, {
      initModel: () => initResult(),
      runModel: () => Promise.reject(new Error('run failed'))
    })
    const client = createModelWorkerClient(clientPort)

    await expect(client.runModel(new ArrayBuffer(8))).rejects.toThrow('run failed')
  })

  it('should reject a second request while one is pending', async () => {
    const [clientPort, workerPort] = createLinkedPorts()
    serveModelWorker(workerPort, {
      initModel: () => new Promise(() => undefined),
      runModel: buffer => buffer
    })
    const client = createModelWorkerClient(clientPort)

    void client.initModel()
    await expect(client.runModel(new ArrayBuffer(8))).rejects.toThrow('only supports one request at a time')
  })

  it('should ignore unrelated messages', async () => {
    const [clientPort, workerPort] = createLinkedPorts()
    serveModelWorker(workerPort, {
      initModel: () => initResult(),
      runModel: buffer => buffer
    })
    const client = createModelWorkerClient(clientPort)

    clientPort.deliver({ kind: 'unrelated' })
    workerPort.deliver({ kind: 'unrelated' })
    await expect(client.initModel()).resolves.toEqual(initResult())
  })

  it('should reject pending and later requests after disposal', async () => {
    const [clientPort, workerPort] = createLinkedPorts()
    serveModelWorker(workerPort, {
      initModel: () => new Promise(() => undefined),
      runModel: buffer => buffer
    })
    const client = createModelWorkerClient(clientPort)

    const pending = client.initModel()
    client.dispose(new Error('runner terminated'))

    await expect(pending).rejects.toThrow('runner terminated')
    await expect(client.initModel()).rejects.toThrow('runner terminated')
  })

  it('should reject pending and later requests after a port error', async () => {
    const [clientPort, workerPort] = createLinkedPorts()
    serveModelWorker(workerPort, {
      initModel: () => new Promise(() => undefined),
      runModel: buffer => buffer
    })
    const client = createModelWorkerClient(clientPort)

    const pending = client.initModel()
    clientPort.fail(new Error('worker failed'))

    await expect(pending).rejects.toThrow('worker failed')
    await expect(client.initModel()).rejects.toThrow('worker failed')
  })

  it('should reject pending requests when the port closes', async () => {
    const [clientPort, workerPort] = createLinkedPorts()
    serveModelWorker(workerPort, {
      initModel: () => new Promise(() => undefined),
      runModel: buffer => buffer
    })
    const client = createModelWorkerClient(clientPort)

    const pending = client.initModel()
    clientPort.close(new Error('worker exited'))

    await expect(pending).rejects.toThrow('worker exited')
  })

  it('should reject pending and later requests after an unexpected response kind', async () => {
    const [clientPort] = createLinkedPorts()
    const client = createModelWorkerClient(clientPort)

    const pending = client.initModel()
    // Deliver a response whose kind does not match the request; the protocol
    // state is corrupt at this point, so the client must become terminal
    clientPort.deliver({ kind: 'ran', buffer: new ArrayBuffer(8) })

    await expect(pending).rejects.toThrow(`Unexpected 'ran' response`)
    await expect(client.initModel()).rejects.toThrow(`Unexpected 'ran' response`)
  })

  it('should reject a request when posting its message throws', async () => {
    const [clientPort] = createLinkedPorts()
    clientPort.postMessage = () => {
      throw new Error('message could not be cloned')
    }
    const client = createModelWorkerClient(clientPort)

    await expect(client.initModel()).rejects.toThrow('message could not be cloned')
  })

  it('should not produce an unhandled rejection when the worker cannot post a response', async () => {
    const [, workerPort] = createLinkedPorts()
    workerPort.postMessage = () => {
      throw new Error('port is closed')
    }
    serveModelWorker(workerPort, {
      initModel: () => initResult(),
      runModel: buffer => buffer
    })

    const onUnhandledRejection = vi.fn()
    process.on('unhandledRejection', onUnhandledRejection)
    try {
      // Both the response post and the fallback error-response post will throw;
      // the worker should swallow the failure rather than leave it as an
      // unhandled rejection (which would crash the worker thread)
      workerPort.deliver({ kind: 'init' })

      // Give the async request handler (and Node's unhandled rejection reporting)
      // a chance to run
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(onUnhandledRejection).not.toHaveBeenCalled()
    } finally {
      process.removeListener('unhandledRejection', onUnhandledRejection)
    }
  })
})
