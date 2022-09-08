import { ModelScheduler } from '@sdeverywhere/runtime'
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'
import modelWorkerJs from './generated/worker.js?raw'

export class Model {
  constructor() {}
}

export async function createModel() {
  // Initialize the wasm model asynchronously.  We inline the worker code in the
  // rolled-up bundle, so that we don't have to fetch a separate `worker.js` file.
  const runner = await spawnAsyncModelRunner({ source: modelWorkerJs })

  // Create the model scheduler
  const scheduler = new ModelScheduler(runner, inputs, outputs)

  // TODO
}
