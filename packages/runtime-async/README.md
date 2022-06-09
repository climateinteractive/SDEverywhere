# @sdeverywhere/runtime-async

This package provides an implementation of the `ModelRunner` interface from
the `@sdeverywhere/runtime` package that uses a Web Worker (in the browser)
or a worker thread (in a Node.js app) to run the model asynchronously off
the main JavaScript thread.

## Usage

### 1. Initialize the `WasmModel` in a Web Worker

In your app project, define a separate JavaScript file, called
`worker.js` for example, that initializes the model worker in the
context of the Web Worker:

```js
import { initWasmModelAndBuffers } from '@sdeverywhere/runtime'
import { exposeModelWorker } from '@sdeverywhere/runtime-async/worker'

async function initWasmModel() {
  const wasmModules = loadWasm()
  return initWasmModelAndBuffers(...)
}

exposeModelWorker(initWasmModel)
```

### 2. Spawn the worker

In your web app, call the `spawnAsyncModelRunner` function, which will
spawn the Web Worker and initialize the `ModelRunner` that communicates
with the worker:

```js
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async/runner'

async function initApp() {
  // ...
  const runner = await spawnAsyncModelRunner({ path: './worker.js' })
  // ...
}
```

## Documentation

API documentation is available in the `docs` directory of the generated package.

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
