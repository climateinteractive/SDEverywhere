[@sdeverywhere/runtime](../index.md) / WasmModelInitResult

# Interface: WasmModelInitResult

The result of model initialization.

## Properties

### model

 **model**: [`WasmModel`](../classes/WasmModel.md)

The wasm model.

___

### inputsBuffer

 **inputsBuffer**: [`WasmBuffer`](../classes/WasmBuffer.md)<`Float64Array`\>

The buffer used to pass input values to the model.

___

### outputsBuffer

 **outputsBuffer**: [`WasmBuffer`](../classes/WasmBuffer.md)<`Float64Array`\>

The buffer used to receive output values from the model.

___

### outputVarIds

 **outputVarIds**: `string`[]

The output variable IDs.
