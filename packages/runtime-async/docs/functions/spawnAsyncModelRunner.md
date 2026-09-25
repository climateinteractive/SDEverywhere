[@sdeverywhere/runtime-async](../index.md) / spawnAsyncModelRunner

# Function: spawnAsyncModelRunner()

> **spawnAsyncModelRunner**(`workerSpec`, `options?`): `Promise`\<[`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md)\>

Initialize a [`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md) that runs the model asynchronously in a worker
(a Web Worker when running in a browser environment, or a worker thread
when running in a Node.js environment).

In your app project, define a JavaScript file, called `worker.js` for example,
that initializes the generated model in the context of a worker thread:

```js
import { exposeModelWorker } from '@sdeverywhere/runtime-async/worker'
import loadGeneratedModel from './sde-prep/generated-model.js'

exposeModelWorker(loadGeneratedModel)
```

Then, in your web app, call the `spawnAsyncModelRunner` function, which
will spawn the worker thread and initialize the [`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md) that communicates
with the worker:

```js
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async/runner'

async function initApp() {
  // ...
  const runner = await spawnAsyncModelRunner({ path: './worker.js' })
  // ...
}
```

The returned promise rejects if the worker fails to initialize the model or
exits unexpectedly.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `workerSpec` | [`WorkerSpec`](../type-aliases/WorkerSpec.md) | Either a `path` to the worker JavaScript file, or the `source` containing the full JavaScript source of the worker. |
| `options?` | [`AsyncModelRunnerOptions`](../interfaces/AsyncModelRunnerOptions.md) | Additional options, such as the Wasm binary to use when the model was compiled without embedding the binary in the generated JS file. |

## Returns

`Promise`\<[`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md)\>
