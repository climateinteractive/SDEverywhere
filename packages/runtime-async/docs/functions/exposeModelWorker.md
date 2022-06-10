[@sdeverywhere/runtime-async](../index.md) / exposeModelWorker

# Function: exposeModelWorker

**exposeModelWorker**(`init`): `void`

Expose an object in the current worker thread that communicates with the
[`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md) instance running in the main thread.  The exposed worker
object will take care of running the `WasmModel` on the worker thread
and sending the outputs back to the main process.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `init` | [`InitWasmModel`](../types/InitWasmModel.md) | The function that initializes the `WasmModel` instance that is used in the worker thread. |

#### Returns

`void`
