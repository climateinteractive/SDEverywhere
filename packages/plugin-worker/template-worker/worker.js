// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { initWasmModelAndBuffers } from '@sdeverywhere/runtime'

// NOTE: This import *must* specify "worker" at the end (instead of the general
// "index" import), otherwise Vite will pull in more code than necessary and it will
// generate a worker that won't run correctly in Node or the browser.
import { exposeModelWorker } from '@sdeverywhere/runtime-async/worker'

import { numInputs, outputVarIds } from 'virtual:model-spec'
import loadWasmModule from '@_wasm_'

async function initWasmModel() {
  // Load the wasm module asynchronously
  const wasmModule = await loadWasmModule()

  // Initialize the wasm model and its associated buffers
  return initWasmModelAndBuffers(wasmModule, numInputs, outputVarIds)
}

exposeModelWorker(initWasmModel)
