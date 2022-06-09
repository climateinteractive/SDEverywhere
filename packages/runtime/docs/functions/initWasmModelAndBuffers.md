[@sdeverywhere/runtime](../entry.md) / initWasmModelAndBuffers

# Function: initWasmModelAndBuffers

**initWasmModelAndBuffers**(`wasmModule`, `numInputs`, `outputVarIds`, `startTime`, `endTime`): [`WasmModelInitResult`](../interfaces/WasmModelInitResult.md)

Initialize the wasm model and buffers.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `wasmModule` | `WasmModule` | The `WasmModule` that wraps the `wasm` binary. |
| `numInputs` | `number` | The number of input variables, per the spec file passed to `sde`. |
| `outputVarIds` | `string`[] | The output variable IDs, per the spec file passed to `sde`. |
| `startTime` | `number` | The start time (year) for the model. |
| `endTime` | `number` | The end time (year) for the model. |

#### Returns

[`WasmModelInitResult`](../interfaces/WasmModelInitResult.md)
