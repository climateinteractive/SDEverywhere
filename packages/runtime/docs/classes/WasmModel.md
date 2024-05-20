[@sdeverywhere/runtime](../index.md) / WasmModel

# Class: WasmModel

An interface to the generated WebAssembly model.  Allows for running the model with
a given set of input values, producing a set of output values.

## Implements

- `RunnableModel`

## Constructors

### constructor

**new WasmModel**(`wasmModule`, `outputVarIds`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `wasmModule` | [`WasmModule`](../interfaces/WasmModule.md) | The `WasmModule` that provides access to the native functions. |
| `outputVarIds` | `string`[] | The output variable IDs for this model. |

## Properties

### startTime

 `Readonly` **startTime**: `number`

The start time for the model (aka `INITIAL TIME`).

#### Implementation of

RunnableModel.startTime

___

### endTime

 `Readonly` **endTime**: `number`

The end time for the model (aka `FINAL TIME`).

#### Implementation of

RunnableModel.endTime

___

### saveFreq

 `Readonly` **saveFreq**: `number`

The frequency with which output values are saved (aka `SAVEPER`).

#### Implementation of

RunnableModel.saveFreq

___

### numSavePoints

 `Readonly` **numSavePoints**: `number`

The number of save points for each output.

#### Implementation of

RunnableModel.numSavePoints

___

### outputVarIds

 `Readonly` **outputVarIds**: `string`[]

The output variable IDs for this model.

#### Implementation of

RunnableModel.outputVarIds

## Methods

### runModel

**runModel**(`params`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `RunModelParams` |

#### Returns

`void`

#### Implementation of

RunnableModel.runModel

___

### terminate

**terminate**(): `void`

#### Returns

`void`

#### Implementation of

RunnableModel.terminate
