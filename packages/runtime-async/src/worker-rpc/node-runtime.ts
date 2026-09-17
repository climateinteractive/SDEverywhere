// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// This module provides access to the Node.js APIs that are needed to run the model
// in a worker thread.  Note that we deliberately avoid a static (or dynamic) import
// of `node:worker_threads` here, and instead use `process.getBuiltinModule`, which
// is a plain property access that bundlers do not need to resolve.  This allows a
// single bundle to work in both browser and Node.js environments without any
// bundler-specific configuration or polyfills.
//
// Note also that we declare only the small structural subset of the Node.js API
// that we actually use, so that this package does not depend on `@types/node`.
//

/**
 * The subset of the Node.js `MessagePort` API that is used by this package.
 * @hidden
 */
export interface NodeMessagePort {
  postMessage(message: unknown, transferList?: Transferable[]): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (arg: any) => void): void
}

/**
 * The subset of the Node.js `Worker` API that is used by this package.
 * @hidden
 */
export interface NodeWorker extends NodeMessagePort {
  terminate(): Promise<number>
  unref(): void
}

/**
 * The subset of the `node:worker_threads` module that is used by this package.
 * @hidden
 */
export interface NodeWorkerThreads {
  Worker: new (source: string | URL, options?: { eval?: boolean }) => NodeWorker
  parentPort?: NodeMessagePort
}

/**
 * The subset of the Node.js `process` object that is used by this package.
 * @hidden
 */
interface NodeProcess {
  versions?: { node?: string }
  getBuiltinModule?(id: string): unknown
}

/**
 * Return the Node.js `process` object, or undefined if not running in Node.js.
 * @hidden
 */
function nodeProcess(): NodeProcess | undefined {
  const process = (globalThis as { process?: NodeProcess }).process
  return process?.versions?.node !== undefined ? process : undefined
}

/**
 * Return true if the current context is running in a Node.js environment (as
 * opposed to a browser environment).
 * @hidden
 */
export function isNodeEnvironment(): boolean {
  return nodeProcess() !== undefined
}

/**
 * Return the `node:worker_threads` module.
 *
 * @returns The `node:worker_threads` module.
 * @throws An error if the module cannot be accessed (for example, when running
 * in a version of Node.js that does not support `process.getBuiltinModule`).
 * @hidden
 */
export function nodeWorkerThreads(): NodeWorkerThreads {
  const getBuiltinModule = nodeProcess()?.getBuiltinModule
  if (getBuiltinModule === undefined) {
    throw new Error(
      'Failed to access the `node:worker_threads` module; @sdeverywhere/runtime-async requires Node.js 22.3 or later'
    )
  }
  return getBuiltinModule('node:worker_threads') as NodeWorkerThreads
}
