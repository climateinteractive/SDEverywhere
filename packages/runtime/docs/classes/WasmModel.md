[@sdeverywhere/runtime](../index.md) / WasmModel

# Class: WasmModel

An interface to the En-ROADS model.  Allows for running the model with
a given set of input values, producing a set of output values.

## Constructors

### constructor

**new WasmModel**(`wasmModule`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `wasmModule` | [`WasmModule`](../interfaces/WasmModule.md) | The `WasmModule` containing the `runModelWithBuffers` function. |

## Properties

### wasmRunModel

 `Private` `Readonly` **wasmRunModel**: (`inputsAddress`: `number`, `outputsAddress`: `number`) => `void`

#### Type declaration

(`inputsAddress`, `outputsAddress`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `inputsAddress` | `number` |
| `outputsAddress` | `number` |

##### Returns

`void`

## Methods

### runModel

**runModel**(`inputs`, `outputs`): `void`

Run the model, using inputs from the `inputs` buffer, and writing outputs into
the `outputs` buffer.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `inputs` | [`WasmBuffer`](WasmBuffer.md) | The buffer containing inputs in the order expected by the model. |
| `outputs` | [`WasmBuffer`](WasmBuffer.md) | The buffer into which the model will store output values. |

#### Returns

`void`
