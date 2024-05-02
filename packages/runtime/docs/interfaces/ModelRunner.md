[@sdeverywhere/runtime](../index.md) / ModelRunner

# Interface: ModelRunner

Abstraction that allows for running the wasm model on the JS thread
or asynchronously (e.g. in a Web Worker), depending on the implementation.

## Methods

### createOutputs

**createOutputs**(): [`Outputs`](../classes/Outputs.md)

Create an `Outputs` instance that is sized to accommodate the output variable
data stored by the model.

#### Returns

[`Outputs`](../classes/Outputs.md)

A new `Outputs` instance.

___

### runModel

**runModel**(`inputs`, `outputs`): `Promise`<[`Outputs`](../classes/Outputs.md)\>

Run the model.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `inputs` | (`number` \| [`InputValue`](InputValue.md))[] | The model input values (must be in the same order as in the spec file). |
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
