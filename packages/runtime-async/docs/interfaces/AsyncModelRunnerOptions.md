[@sdeverywhere/runtime-async](../index.md) / AsyncModelRunnerOptions

# Interface: AsyncModelRunnerOptions

Options for [spawnAsyncModelRunner](../functions/spawnAsyncModelRunner.md).

## Properties

### initArgs?

> `optional` **initArgs?**: `unknown`

A value that is passed to the model initialization function in the worker (the
function that was passed to `exposeModelWorker`).  This must be compatible with the
structured clone algorithm.

For example, a Wasm model that was compiled without embedding the Wasm binary in the
generated JS file (i.e., without `-sSINGLE_FILE=1`) can be initialized by passing the
binary (as an `ArrayBuffer`) to the Emscripten-generated module factory function:
```js
const wasmBinary = await (await fetch(wasmUrl)).arrayBuffer()
const runner = await spawnAsyncModelRunner(
  { path: './worker.js' },
  { initArgs: { wasmBinary }, transfer: [wasmBinary] }
)
```

***

### transfer?

> `optional` **transfer?**: `Transferable`[]

The objects in `initArgs` (e.g., an `ArrayBuffer`) whose ownership should be
transferred to the worker instead of being copied.  Note that transferred objects
are no longer usable in the calling context.
