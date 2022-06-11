[@sdeverywhere/runtime](../index.md) / ModelRunner

# Interface: ModelRunner

Abstraction that allows for running the wasm model on the JS thread
or asynchronously (e.g. in a Web Worker), depending on the implementation.

## Methods

### runModel

**runModel**(`inputs`, `outputs`): `Promise`<[`Outputs`](../classes/Outputs.md)\>

Run the model.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `inputs` | [`InputValue`](InputValue.md)[] | The model input values (must be in the same order as in the spec file). |
| `outputs` | [`Outputs`](../classes/Outputs.md) | The structure into which the model outputs will be stored. |

#### Returns

`Promise`<[`Outputs`](../classes/Outputs.md)\>

A promise that resolves with the outputs when the model run is complete.

___

### terminate

**terminate**(): `Promise`<`void`\>

Terminate the runner by releasing underlying resources (e.g., the worker thread or
Wasm module/buffers).

#### Returns

`Promise`<`void`\>
