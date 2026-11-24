// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { test, expect } from './support/fixtures'

/** The URL of the current check bundle, as served by the test bundles server. */
const bundleUrl = 'http://localhost:9000/sde-prep/check-bundle.js'

test('should transfer the runtime I/O buffer without copying it', async ({ app }) => {
  await app.visitReport()

  const result = await app.page.evaluate(async (url: string) => {
    const { createBundle } = await import(/* @vite-ignore */ url)
    const requestTransfers: { before: number; after: number }[] = []
    const responseTransfers: { before: number; after: number }[] = []
    const NativeBlob = globalThis.Blob
    const NativeWorker = globalThis.Worker
    const nativeWorkerPostMessage = NativeWorker.prototype.postMessage

    // Prepend this script to the real model worker source. It wraps the worker's
    // postMessage function and reports the buffer length immediately after the
    // runtime sends a `ran` response with that buffer in its transfer list.
    const workerInstrumentation = `
const nativePostMessage = globalThis.postMessage.bind(globalThis)
globalThis.postMessage = (message, transferables) => {
  if (message?.kind === 'ran' && message.buffer instanceof ArrayBuffer) {
    const before = message.buffer.byteLength
    nativePostMessage(message, transferables)
    nativePostMessage({
      kind: 'sde-transfer-observation',
      before,
      after: message.buffer.byteLength
    })
  } else {
    nativePostMessage(message, transferables)
  }
}
`

    class InstrumentedBlob extends NativeBlob {
      constructor(blobParts?: BlobPart[], options?: BlobPropertyBag) {
        super([workerInstrumentation, ...(blobParts ?? [])], options)
      }
    }

    class InstrumentedWorker extends NativeWorker {
      constructor(scriptURL: string | URL, options?: WorkerOptions) {
        super(scriptURL, options)
        this.addEventListener('message', event => {
          if (event.data?.kind === 'sde-transfer-observation') {
            responseTransfers.push({ before: event.data.before, after: event.data.after })
          }
        })
      }
    }

    // Wrap the main-thread side of postMessage so that we inspect the buffer
    // immediately after runtime-async sends its real `run` request.
    NativeWorker.prototype.postMessage = function (
      message: unknown,
      transferOrOptions?: Transferable[] | StructuredSerializeOptions
    ): void {
      const request = message as { kind?: string; buffer?: unknown }
      if (request.kind === 'run' && request.buffer instanceof ArrayBuffer) {
        const before = request.buffer.byteLength
        nativeWorkerPostMessage.call(this, message, transferOrOptions)
        requestTransfers.push({ before, after: request.buffer.byteLength })
      } else {
        nativeWorkerPostMessage.call(this, message, transferOrOptions)
      }
    }
    globalThis.Blob = InstrumentedBlob
    globalThis.Worker = InstrumentedWorker

    try {
      const bundle = createBundle()
      const datasetKey = [...bundle.modelSpec.outputVars.keys()][0]
      const bundleModel = await bundle.initModel()
      const scenario = {
        kind: 'all-inputs',
        uid: 'all_inputs_at_default',
        position: 'at-default'
      }
      const datasets = await bundleModel.getDatasetsForScenario(scenario, [datasetKey])

      // The worker posts its observation immediately after the model result. Give
      // that second message event a turn before returning the captured values.
      await new Promise(resolve => setTimeout(resolve, 0))

      return {
        requestTransfers,
        responseTransfers,
        outputValueCount: datasets.datasetMap.get(datasetKey)?.size ?? 0
      }
    } finally {
      NativeWorker.prototype.postMessage = nativeWorkerPostMessage
      globalThis.Blob = NativeBlob
      globalThis.Worker = NativeWorker
    }
  }, bundleUrl)

  expect(result.requestTransfers).toHaveLength(1)
  expect(result.requestTransfers[0].before).toBeGreaterThan(0)
  expect(result.requestTransfers[0].after).toBe(0)

  expect(result.responseTransfers).toHaveLength(1)
  expect(result.responseTransfers[0].before).toBeGreaterThan(0)
  expect(result.responseTransfers[0].after).toBe(0)

  expect(result.outputValueCount).toBeGreaterThan(0)
})
