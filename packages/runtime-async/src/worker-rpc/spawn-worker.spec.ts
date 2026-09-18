// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it, vi } from 'vitest'

import type { WorkerHandle } from './worker-port'
import { portForWebWorker, spawnWorker } from './spawn-worker'

/**
 * The source of a worker that echoes each message back to the runner.  Note that
 * this is written in CommonJS style (like the worker bundles produced by
 * `plugin-worker`, which are built in `iife` format).
 */
const echoWorkerSource = `
const { parentPort } = process.getBuiltinModule('node:worker_threads')
parentPort.on('message', msg => {
  if (msg && msg.buffer) {
    parentPort.postMessage({ echoed: msg.buffer }, [msg.buffer])
  } else {
    parentPort.postMessage({ echoed: msg })
  }
})
`

/** Directories created for the `path` based tests; removed after the tests run. */
const tempDirs: string[] = []

afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
})

/**
 * Write the given worker source to a temporary file and return the path.
 *
 * @param source The JavaScript source of the worker.
 * @returns The path of the file containing the worker source.
 */
function writeTempWorkerFile(source: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'sde-worker-'))
  tempDirs.push(dir)
  const path = join(dir, 'worker.cjs')
  writeFileSync(path, source)
  return path
}

/**
 * Return a promise that resolves with the first message received on the given handle.
 *
 * @param handle The worker handle to listen on.
 * @returns The first message received on the handle.
 */
function nextMessage(handle: WorkerHandle): Promise<unknown> {
  return new Promise(resolve => handle.onMessage(resolve))
}

describe('spawnWorker (in a Node environment)', () => {
  it('should spawn a worker from the given source and exchange messages', async () => {
    const handle = spawnWorker({ source: echoWorkerSource })
    try {
      const received = nextMessage(handle)
      handle.postMessage({ hello: 'world' })
      expect(await received).toEqual({ echoed: { hello: 'world' } })
    } finally {
      await handle.terminate()
    }
  })

  it('should spawn a worker from the given path and exchange messages', async () => {
    const path = writeTempWorkerFile(echoWorkerSource)
    const handle = spawnWorker({ path })
    try {
      const received = nextMessage(handle)
      handle.postMessage({ hello: 'from path' })
      expect(await received).toEqual({ echoed: { hello: 'from path' } })
    } finally {
      await handle.terminate()
    }
  })

  it('should transfer (not copy) the given transferables', async () => {
    const handle = spawnWorker({ source: echoWorkerSource })
    try {
      const received = nextMessage(handle)

      const buffer = new ArrayBuffer(16)
      new Uint8Array(buffer).set([1, 2, 3])
      handle.postMessage({ buffer }, [buffer])

      // The local buffer should be detached once it has been transferred
      expect(buffer.byteLength).toBe(0)

      // The buffer that is transferred back should retain the original contents
      const message = (await received) as { echoed: ArrayBuffer }
      expect(message.echoed.byteLength).toBe(16)
      expect(Array.from(new Uint8Array(message.echoed).slice(0, 3))).toEqual([1, 2, 3])
    } finally {
      await handle.terminate()
    }
  })

  it('should report an error when the worker throws', async () => {
    const handle = spawnWorker({ source: `throw new Error('worker init failed')` })
    try {
      const error = await new Promise<Error>(resolve => handle.onError(resolve))
      expect(error.message).toContain('worker init failed')
    } finally {
      await handle.terminate()
    }
  })

  it('should report when the worker exits without an error', async () => {
    const handle = spawnWorker({ source: '' })
    const error = await new Promise<Error>(resolve => handle.onClose(resolve))
    expect(error.message).toContain('exited')
  })

  it('should resolve the promise returned by terminate', async () => {
    const handle = spawnWorker({ source: echoWorkerSource })
    await expect(handle.terminate()).resolves.toBeUndefined()
  })
})

describe('portForWebWorker', () => {
  /**
   * Create a minimal stand-in for a `Worker` instance as implemented by a browser.
   *
   * @returns The mock worker along with the listeners that were installed on it.
   */
  function createMockWebWorker() {
    const listeners = new Map<string, (event: unknown) => void>()
    return {
      listeners,
      worker: {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        addEventListener: (type: string, listener: (event: unknown) => void) => {
          listeners.set(type, listener)
        }
      }
    }
  }

  it('should forward posted messages and transferables to the worker', () => {
    const { worker } = createMockWebWorker()
    const handle = portForWebWorker(worker)

    const buffer = new ArrayBuffer(8)
    handle.postMessage({ a: 1 }, [buffer])

    expect(worker.postMessage).toHaveBeenCalledWith({ a: 1 }, [buffer])
  })

  it('should omit the transfer list when no transferables are given', () => {
    const { worker } = createMockWebWorker()
    const handle = portForWebWorker(worker)

    handle.postMessage({ a: 1 })

    expect(worker.postMessage).toHaveBeenCalledWith({ a: 1 }, [])
  })

  it('should deliver the data from a message event to the message handler', () => {
    const { worker, listeners } = createMockWebWorker()
    const handle = portForWebWorker(worker)

    const received: unknown[] = []
    handle.onMessage(message => received.push(message))
    listeners.get('message')?.({ data: { a: 1 } })

    expect(received).toEqual([{ a: 1 }])
  })

  it('should convert an error event to an Error instance', () => {
    const { worker, listeners } = createMockWebWorker()
    const handle = portForWebWorker(worker)

    let received: Error
    handle.onError(error => (received = error))
    listeners.get('error')?.({ message: 'something broke' })

    expect(received).toBeInstanceOf(Error)
    expect(received.message).toBe('something broke')
  })

  it('should use the underlying error from an error event when available', () => {
    const { worker, listeners } = createMockWebWorker()
    const handle = portForWebWorker(worker)

    let received: Error
    handle.onError(error => (received = error))
    const underlying = new Error('the real error')
    listeners.get('error')?.({ message: 'something broke', error: underlying })

    expect(received).toBe(underlying)
  })

  it('should terminate the worker and resolve', async () => {
    const { worker } = createMockWebWorker()
    const handle = portForWebWorker(worker)

    await expect(handle.terminate()).resolves.toBeUndefined()
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })
})
