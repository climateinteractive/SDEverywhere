// Copyright (c) 2026 Climate Interactive / New Venture Fund

import type { NodeMessagePort } from './node-runtime'
import { isNodeEnvironment, nodeWorkerThreads } from './node-runtime'
import type { WorkerPort } from './worker-port'

/**
 * The subset of the Web Worker global scope API that is used by this package.
 * @hidden
 */
interface WorkerGlobalScope {
  postMessage(message: unknown, transferables?: Transferable[]): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addEventListener(type: string, listener: (event: any) => void): void
}

/**
 * Adapt the `parentPort` from `node:worker_threads` to the `WorkerPort` interface.
 *
 * @param parentPort The port that is connected to the parent (runner) thread.
 * @returns The port for communicating with the runner.
 * @hidden For internal use only.
 */
export function portForNodeParentPort(parentPort: NodeMessagePort): WorkerPort {
  return {
    postMessage: (message, transferables) => parentPort.postMessage(message, transferables ?? []),

    onMessage: handler => parentPort.on('message', handler)
  }
}

/**
 * Adapt the global scope of a Web Worker to the `WorkerPort` interface.
 *
 * @param scope The global scope of the Web Worker.
 * @returns The port for communicating with the runner.
 * @hidden For internal use only.
 */
export function portForWorkerGlobalScope(scope: WorkerGlobalScope): WorkerPort {
  return {
    postMessage: (message, transferables) => scope.postMessage(message, transferables ?? []),

    onMessage: handler => scope.addEventListener('message', event => handler(event.data))
  }
}

/**
 * Return the port that connects this worker to the runner running in the main thread.
 *
 * @returns The port for communicating with the runner.
 * @throws An error if the current context is not a worker.
 * @hidden For internal use only.
 */
export function parentWorkerPort(): WorkerPort {
  if (isNodeEnvironment()) {
    const { parentPort } = nodeWorkerThreads()
    if (parentPort === undefined) {
      throw new Error('The `exposeModelWorker` function must be called from a worker thread')
    }
    return portForNodeParentPort(parentPort)
  } else {
    const scope = globalThis as unknown as WorkerGlobalScope
    if ('document' in globalThis || typeof scope.postMessage !== 'function') {
      throw new Error('The `exposeModelWorker` function must be called from a worker thread')
    }
    return portForWorkerGlobalScope(scope)
  }
}
