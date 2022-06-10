[@sdeverywhere/runtime-async](../index.md) / spawnAsyncModelRunner

# Function: spawnAsyncModelRunner

**spawnAsyncModelRunner**(`workerSpec`): `Promise`<[`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md)\>

Initialize a [`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md) that runs the model asynchronously in a worker thread.

In your app project, define a JavaScript file, called `worker.js` for example, that
initializes the model worker in the context of the Web Worker:

```js
import { initWasmModelAndBuffers } from '@sdeverywhere/runtime'
import { exposeModelWorker } from '@sdeverywhere/runtime-async/worker'

async function initWasmModel() {
  const wasmModules = loadWasm()
  return initWasmModelAndBuffers(...)
}

exposeModelWorker(initWasmModel)
```

Then, in your web app, call the `spawnAsyncModelRunner` function, which
will spawn the Web Worker and initialize the [`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md) that communicates
with the worker:

```js
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async/runner'

async function initApp() {
  // ...
  const runner = await spawnAsyncModelRunner({ path: './worker.js' })
  // ...
}
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `workerSpec` | { `path`: `string`  } \| { `source`: `string`  } | Either a `path` to the worker JavaScript file, or the `source` containing the full JavaScript source of the worker. |

#### Returns

`Promise`<[`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md)\>
