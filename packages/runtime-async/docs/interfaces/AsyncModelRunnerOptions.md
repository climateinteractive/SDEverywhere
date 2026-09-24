[@sdeverywhere/runtime-async](../index.md) / AsyncModelRunnerOptions

# Interface: AsyncModelRunnerOptions

Options for [spawnAsyncModelRunner](../functions/spawnAsyncModelRunner.md).

## Properties

### wasmBinary?

> `optional` **wasmBinary?**: `ArrayBuffer`

The Wasm binary for a model that was compiled without embedding the binary in the
generated JS file (i.e., without `-sSINGLE_FILE=1`), for example when the `plugin-wasm`
`outputWasmPath` option is used.  The binary is sent to the worker, which passes it to
the Emscripten-generated module factory function:
```js
const wasmBinary = await (await fetch(wasmUrl)).arrayBuffer()
const runner = await spawnAsyncModelRunner({ path: './worker.js' }, { wasmBinary })
```

Note that the binary is copied (not transferred) when it is sent to the worker, so it
remains usable in the calling context, for example if it is used to spawn more than
one runner.
