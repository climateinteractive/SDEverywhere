[@sdeverywhere/runtime-async](../index.md) / ModelInitArgs

# Interface: ModelInitArgs

The arguments that are passed from the runner in the main thread to the model
initialization function in the worker (the function that was passed to
`exposeModelWorker`).

Note that this has the same shape as the module argument that is accepted by the
factory function exported by an Emscripten-generated Wasm model, so that function
can be passed to `exposeModelWorker` directly.

## Properties

### wasmBinary?

> `optional` **wasmBinary?**: `ArrayBuffer`

The Wasm binary, if the model was compiled without embedding the binary in the
generated JS file (i.e., without `-sSINGLE_FILE=1`).
