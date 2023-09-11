[@sdeverywhere/runtime](../index.md) / WasmModel

# Class: WasmModel

An interface to the generated WebAssembly model.  Allows for running the model with
a given set of input values, producing a set of output values.

## Constructors

### constructor

**new WasmModel**(`wasmModule`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `wasmModule` | [`WasmModule`](../interfaces/WasmModule.md) | The `WasmModule` that provides access to the native functions. |

## Properties

### startTime

 `Readonly` **startTime**: `number`

The start time for the model (aka `INITIAL TIME`).

___

### endTime

 `Readonly` **endTime**: `number`

The end time for the model (aka `FINAL TIME`).

___

### saveFreq

 `Readonly` **saveFreq**: `number`

The frequency with which output values are saved (aka `SAVEPER`).

___

### numSavePoints

 `Readonly` **numSavePoints**: `number`

The number of save points for each output.

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
