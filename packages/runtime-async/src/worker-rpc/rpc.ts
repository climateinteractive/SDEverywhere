// Copyright (c) 2026 Climate Interactive / New Venture Fund

import type { WorkerPort } from './worker-port'

/**
 * The tag used to distinguish the messages used by this package from any other
 * messages that might be exchanged over the same channel.
 * @hidden
 */
const rpcTag = 'sde-rpc'

/**
 * A message that asks the worker to invoke one of the exposed methods.
 * @hidden
 */
interface RpcRequest {
  tag: typeof rpcTag
  kind: 'request'
  id: number
  method: string
  arg: unknown
}

/**
 * A message that carries the result (or the error) for a single request.
 * @hidden
 */
interface RpcResponse {
  tag: typeof rpcTag
  kind: 'response'
  id: number
  value?: unknown
  errorMessage?: string
}

/**
 * A value that is returned by an RPC method along with the objects that should be
 * transferred (rather than copied) when the value is sent back to the runner.
 */
export interface RpcTransfer<T> {
  /** The value to send. */
  value: T
  /** The objects to transfer along with the value. */
  transferables: Transferable[]
}

/**
 * Wrap a value so that the given objects are transferred (rather than copied) when
 * the value is sent back to the runner.
 *
 * @param value The value to send.
 * @param transferables The objects to transfer along with the value.
 * @returns The wrapped value.
 */
export function withTransfer<T>(value: T, transferables: Transferable[]): RpcTransfer<T> {
  return { value, transferables }
}

/**
 * The set of methods that are exposed by the worker, keyed by method name.
 */
export interface RpcMethods {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: (arg?: any) => unknown
}

/**
 * Sends requests to the methods exposed by the worker and resolves the associated
 * responses.
 */
export interface RpcClient {
  /**
   * Invoke the named method in the worker and wait for the result.
   *
   * @param method The name of the method to invoke in the worker.
   * @param arg The (structured-cloneable) argument to pass to the method.
   * @param transferables The objects that should be transferred (rather than copied)
   * along with the argument.
   * @returns The value returned by the method in the worker.
   * @throws An error if the method throws, or if the client is disposed (or the
   * underlying port fails) before the method returns.
   */
  request<T>(method: string, arg?: unknown, transferables?: Transferable[]): Promise<T>

  /**
   * Reject all pending requests (and any subsequent ones) with the given error.
   *
   * @param error The error used to reject the requests.
   */
  dispose(error: Error): void
}

/**
 * Return true if the given message is one of the messages used by this package.
 *
 * @param message The received message.
 * @param kind The expected message kind.
 * @hidden
 */
function isRpcMessage<T extends RpcRequest | RpcResponse>(message: unknown, kind: T['kind']): message is T {
  const candidate = message as Partial<RpcRequest | RpcResponse>
  return candidate?.tag === rpcTag && candidate.kind === kind
}

/**
 * Create a client that invokes the methods exposed by the worker on the other end
 * of the given port.
 *
 * @param port The port that is connected to the worker.
 * @returns The client instance.
 */
export function createRpcClient(port: WorkerPort): RpcClient {
  /** The callbacks for the requests that have not been settled yet, keyed by request ID. */
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()

  /** The ID used for the next request. */
  let nextRequestId = 1

  /** The error that caused the client to be disposed, if it has been disposed. */
  let disposedError: Error

  /**
   * Reject all pending requests with the given error.
   *
   * @param error The error used to reject the requests.
   */
  function rejectAll(error: Error): void {
    // Take a copy of the callbacks before rejecting, since rejecting can cause
    // other requests to be settled
    const callbacks = [...pending.values()]
    pending.clear()
    for (const callback of callbacks) {
      callback.reject(error)
    }
  }

  port.onMessage(message => {
    if (!isRpcMessage<RpcResponse>(message, 'response')) {
      // Ignore any message that was not sent by this package
      return
    }

    const callback = pending.get(message.id)
    if (callback === undefined) {
      // Ignore a response for a request that was already settled
      return
    }
    pending.delete(message.id)

    if (message.errorMessage !== undefined) {
      callback.reject(new Error(message.errorMessage))
    } else {
      callback.resolve(message.value)
    }
  })

  port.onError(error => {
    // If the worker fails, there is no way for the pending requests to be settled,
    // so reject them all
    rejectAll(error)
  })

  return {
    request<T>(method: string, arg?: unknown, transferables?: Transferable[]): Promise<T> {
      if (disposedError) {
        return Promise.reject(disposedError)
      }

      const id = nextRequestId++
      const promise = new Promise<T>((resolve, reject) => {
        pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
      })

      const request: RpcRequest = {
        tag: rpcTag,
        kind: 'request',
        id,
        method,
        arg
      }
      port.postMessage(request, transferables)

      return promise
    },

    dispose(error: Error): void {
      disposedError = error
      rejectAll(error)
    }
  }
}

/**
 * Handle the requests that arrive on the given port by invoking the matching method
 * and posting the result back to the runner.
 *
 * @param port The port that is connected to the runner.
 * @param methods The methods that are exposed to the runner, keyed by method name.
 */
export function serveRpcRequests(port: WorkerPort, methods: RpcMethods): void {
  port.onMessage(message => {
    if (!isRpcMessage<RpcRequest>(message, 'request')) {
      // Ignore any message that was not sent by this package
      return
    }

    const { id, method, arg } = message

    /**
     * Post the given response back to the runner.
     *
     * @param response The response to post.
     * @param transferables The objects to transfer along with the response.
     */
    function respond(response: Omit<RpcResponse, 'tag' | 'kind' | 'id'>, transferables?: Transferable[]): void {
      port.postMessage({ tag: rpcTag, kind: 'response', id, ...response } satisfies RpcResponse, transferables)
    }

    const fn = methods[method]
    if (fn === undefined) {
      respond({ errorMessage: `Unknown RPC method '${method}'` })
      return
    }

    // Note that we wrap the call in `Promise.resolve` so that methods can be either
    // synchronous or asynchronous
    Promise.resolve()
      .then(() => fn(arg))
      .then(
        result => {
          const transfer = result as RpcTransfer<unknown>
          if (transfer?.transferables !== undefined) {
            respond({ value: transfer.value }, transfer.transferables)
          } else {
            respond({ value: result })
          }
        },
        (error: unknown) => {
          respond({ errorMessage: error instanceof Error ? error.message : String(error) })
        }
      )
  })
}
