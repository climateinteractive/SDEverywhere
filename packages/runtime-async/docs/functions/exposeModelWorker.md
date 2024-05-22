[@sdeverywhere/runtime-async](../index.md) / exposeModelWorker

# Function: exposeModelWorker

**exposeModelWorker**(`init`): `void`

Expose an object in the current worker thread that communicates with the
[`ModelRunner`](../../../runtime/docs/interfaces/ModelRunner.md) instance running in the main thread.  The exposed worker
object will take care of running the model on the worker thread and
sending the outputs back to the main thread.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `init` | () => `Promise`<`GeneratedModel`\> | The function that initializes the generated model instance that is used in the worker thread. |

#### Returns

`void`
