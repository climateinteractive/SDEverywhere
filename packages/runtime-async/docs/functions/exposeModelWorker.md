[@sdeverywhere/runtime-async](../index.md) / exposeModelWorker

# Function: exposeModelWorker()

> **exposeModelWorker**(`init`): `void`

Expose an object in the current worker thread that communicates with the
[`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md) instance running in the main thread.  The exposed worker
object will take care of running the model on the worker thread and
sending the outputs back to the main thread.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `init` | (`initArgs?`) => `Promise`\<`GeneratedModel`\> | The function that initializes the generated model instance that is used in the worker thread. This is passed the [ModelInitArgs](../interfaces/ModelInitArgs.md) derived from the options (if any) that were passed to `spawnAsyncModelRunner` in the main thread, or undefined if there are none. Note that the factory function exported by an Emscripten-generated Wasm model accepts those arguments as its module argument, so it can be passed here directly. |

## Returns

`void`
