[@sdeverywhere/runtime-async](../index.md) / exposeModelWorker

# Function: exposeModelWorker()

> **exposeModelWorker**\<`InitArgs`\>(`init`): `void`

Expose an object in the current worker thread that communicates with the
[`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md) instance running in the main thread.  The exposed worker
object will take care of running the model on the worker thread and
sending the outputs back to the main thread.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `InitArgs` | `unknown` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `init` | (`initArgs?`) => `Promise`\<`GeneratedModel`\> | The function that initializes the generated model instance that is used in the worker thread. This is passed the `initArgs` value (if any) that was passed to `spawnAsyncModelRunner` in the main thread. Note that the function exported by an Emscripten-generated Wasm model can be used directly, in which case `initArgs` (if defined) is used as the Emscripten module argument (for example, `{ wasmBinary }`). |

## Returns

`void`
