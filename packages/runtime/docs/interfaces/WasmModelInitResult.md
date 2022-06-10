[@sdeverywhere/runtime](../index.md) / WasmModelInitResult

# Interface: WasmModelInitResult

The result of model initialization.

## Properties

### endTime

 **endTime**: `number`

The end time (year) for the model.

___

### inputsBuffer

 **inputsBuffer**: [`WasmBuffer`](../classes/WasmBuffer.md)

The buffer used to pass input values to the model.

___

### model

 **model**: [`WasmModel`](../classes/WasmModel.md)

The wasm model.

___

### outputVarIds

 **outputVarIds**: `string`[]

The output variable IDs.

___

### outputsBuffer

 **outputsBuffer**: [`WasmBuffer`](../classes/WasmBuffer.md)

The buffer used to receive output values from the model.

___

### startTime

 **startTime**: `number`

The start time (year) for the model.
