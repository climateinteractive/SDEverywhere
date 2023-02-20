[@sdeverywhere/runtime](../index.md) / initWasmModelAndBuffers

# Function: initWasmModelAndBuffers

**initWasmModelAndBuffers**(`wasmModule`, `numInputs`, `outputVarIds`): [`WasmModelInitResult`](../interfaces/WasmModelInitResult.md)

Initialize the wasm model and buffers.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `wasmModule` | [`WasmModule`](../interfaces/WasmModule.md) | The `WasmModule` that wraps the `wasm` binary. |
| `numInputs` | `number` | The number of input variables, per the spec file passed to `sde`. |
| `outputVarIds` | `string`[] | The output variable IDs, per the spec file passed to `sde`. |

#### Returns

[`WasmModelInitResult`](../interfaces/WasmModelInitResult.md)
