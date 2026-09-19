// Copyright (c) 2026 Climate Interactive / New Venture Fund

/**
 * A minimal, environment-neutral view of one end of a message channel that
 * connects the runner (running in the main thread) to the worker.
 *
 * This is implemented on top of a Web Worker when running in a browser
 * environment, or on top of a `worker_threads` worker when running in a
 * Node.js environment.  Keeping this interface small means that the rest of
 * the package has no direct dependency on either environment.
 *
 * Note that this interface declares only what the worker side of the channel
 * needs; the runner side uses the wider `WorkerHandle` interface, which adds
 * the error/close notifications and termination that only the runner acts on.
 */
export interface WorkerPort {
  /**
   * Post a message to the other end of the channel.
   *
   * @param message The message to post.
   * @param transferables The objects that should be transferred (rather than copied)
   * along with the message.
   */
  postMessage(message: unknown, transferables?: Transferable[]): void

  /**
   * Install the handler that is called for each message received on this port.
   * Only one handler can be installed at a time.
   *
   * @param handler The function that is called with each received message.
   */
  onMessage(handler: (message: unknown) => void): void
}

/**
 * A `WorkerPort` for a worker that was spawned by the runner, which additionally
 * reports worker errors, reports when the worker exits, and allows for terminating
 * the underlying worker.
 */
export interface WorkerHandle extends WorkerPort {
  /**
   * Install the handler that is called when an error occurs in the worker or
   * on the channel.  Only one handler can be installed at a time.
   *
   * @param handler The function that is called with each error.
   */
  onError(handler: (error: Error) => void): void

  /**
   * Install the handler that is called when the worker exits, if the underlying
   * platform reports that event.
   *
   * @param handler The function that is called when the worker exits.
   */
  onClose(handler: (error: Error) => void): void

  /**
   * Terminate the underlying worker and release any associated resources.
   *
   * @returns A promise that resolves when the worker has been terminated.
   */
  terminate(): Promise<void>
}
