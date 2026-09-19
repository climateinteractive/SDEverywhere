// Copyright (c) 2026 Climate Interactive / New Venture Fund

import type { WorkerHandle, WorkerPort } from './worker-port'

/** The model metadata returned after the worker initializes the model. */
export interface InitResult {
  /** The IDs of the output variables, in output-buffer order. */
  outputVarIds: string[]
  /** The model listing, if it was included in the generated model. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelListing?: /*ModelListingSpecs*/ any
  /** The start time of the model. */
  startTime: number
  /** The end time of the model. */
  endTime: number
  /** The frequency at which output values are saved. */
  saveFreq: number
}

/** A request sent from the runner to the model worker. */
type ModelWorkerRequest = { kind: 'init' } | { kind: 'run'; buffer: ArrayBuffer }

/** A response sent from the model worker to the runner. */
type ModelWorkerResponse =
  | { kind: 'initialized'; result: InitResult }
  | { kind: 'ran'; buffer: ArrayBuffer }
  | { kind: 'error'; message: string }

/** The operations that can be performed by the model worker. */
export interface ModelWorkerMethods {
  /** Initialize the model and return its metadata. */
  initModel(): InitResult | Promise<InitResult>
  /** Run the model using the parameters encoded in the given buffer. */
  runModel(buffer: ArrayBuffer): ArrayBuffer | Promise<ArrayBuffer>
}

/** A client for the operations exposed by the model worker. */
export interface ModelWorkerClient {
  /** Initialize the model and return its metadata. */
  initModel(): Promise<InitResult>
  /** Run the model using the parameters encoded in the given buffer. */
  runModel(buffer: ArrayBuffer): Promise<ArrayBuffer>
  /** Make the client terminal and reject its pending request. */
  dispose(error: Error): void
}

/** The callbacks for the single request that is currently pending. */
interface PendingRequest {
  /** Resolve the request with a worker response. */
  resolve(response: ModelWorkerResponse): void
  /** Reject the request with an error. */
  reject(error: Error): void
}

/** Return whether the message is a model worker request. */
function isModelWorkerRequest(message: unknown): message is ModelWorkerRequest {
  const kind = (message as Partial<ModelWorkerRequest>)?.kind
  return kind === 'init' || kind === 'run'
}

/** Return whether the message is a model worker response. */
function isModelWorkerResponse(message: unknown): message is ModelWorkerResponse {
  const kind = (message as Partial<ModelWorkerResponse>)?.kind
  return kind === 'initialized' || kind === 'ran' || kind === 'error'
}

/**
 * Create a client for the model worker connected to the given handle.
 *
 * @param port The handle for the spawned model worker.
 * @returns The model worker client.
 */
export function createModelWorkerClient(port: WorkerHandle): ModelWorkerClient {
  let pending: PendingRequest | undefined
  let terminalError: Error | undefined

  /** Reject the pending request, without making the client terminal. */
  function rejectPending(error: Error): void {
    const request = pending
    pending = undefined
    request?.reject(error)
  }

  /** Make the client terminal and reject its pending request. */
  function fail(error: Error): void {
    if (terminalError === undefined) {
      terminalError = error
      rejectPending(error)
    }
  }

  /** Send one request to the worker and wait for its response. */
  function send(request: ModelWorkerRequest, transferables?: Transferable[]): Promise<ModelWorkerResponse> {
    if (terminalError !== undefined) {
      return Promise.reject(terminalError)
    }
    if (pending !== undefined) {
      return Promise.reject(new Error('Model worker only supports one request at a time'))
    }

    const response = new Promise<ModelWorkerResponse>((resolve, reject) => {
      pending = { resolve, reject }
    })
    try {
      port.postMessage(request, transferables)
    } catch (error) {
      rejectPending(error instanceof Error ? error : new Error(String(error)))
    }
    return response
  }

  port.onMessage(message => {
    if (!isModelWorkerResponse(message)) {
      return
    }

    const request = pending
    if (request === undefined) {
      return
    }
    pending = undefined

    if (message.kind === 'error') {
      request.reject(new Error(message.message))
    } else {
      request.resolve(message)
    }
  })
  port.onError(error => fail(error))
  port.onClose(error => fail(error))

  return {
    async initModel(): Promise<InitResult> {
      const response = await send({ kind: 'init' })
      if (response.kind !== 'initialized') {
        throw new Error(`Unexpected '${response.kind}' response to model initialization request`)
      }
      return response.result
    },

    async runModel(buffer: ArrayBuffer): Promise<ArrayBuffer> {
      const response = await send({ kind: 'run', buffer }, [buffer])
      if (response.kind !== 'ran') {
        throw new Error(`Unexpected '${response.kind}' response to model run request`)
      }
      return response.buffer
    },

    dispose(error: Error): void {
      fail(error)
    }
  }
}

/**
 * Serve model worker requests received on the given port.
 *
 * @param port The port connected to the runner.
 * @param methods The model worker operations.
 */
export function serveModelWorker(port: WorkerPort, methods: ModelWorkerMethods): void {
  port.onMessage(message => {
    if (!isModelWorkerRequest(message)) {
      return
    }
    const request = message

    /** Handle the received request and post its response. */
    async function handleRequest(): Promise<void> {
      try {
        if (request.kind === 'init') {
          const result = await methods.initModel()
          port.postMessage({ kind: 'initialized', result } satisfies ModelWorkerResponse)
        } else {
          const buffer = await methods.runModel(request.buffer)
          port.postMessage({ kind: 'ran', buffer } satisfies ModelWorkerResponse, [buffer])
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        port.postMessage({ kind: 'error', message: errorMessage } satisfies ModelWorkerResponse)
      }
    }

    void handleRequest()
  })
}
