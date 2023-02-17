[@sdeverywhere/runtime](../index.md) / initWasmModelAndBuffers

# Function: initWasmModelAndBuffers

**initWasmModelAndBuffers**(`wasmModule`, `numInputs`, `outputVarIds`, `useOutputIndices?`): [`WasmModelInitResult`](../interfaces/WasmModelInitResult.md)

Initialize the wasm model and buffers.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `wasmModule` | [`WasmModule`](../interfaces/WasmModule.md) | `undefined` | The `WasmModule` that wraps the `wasm` binary. |
| `numInputs` | `number` | `undefined` | The number of input variables, per the spec file passed to `sde`. |
| `outputVarIds` | `string`[] | `undefined` | The output variable IDs, per the spec file passed to `sde`. |
| `useOutputIndices` | `boolean` | `false` | Whether to initialize the `outputIndicesBuffer`. |

#### Returns

[`WasmModelInitResult`](../interfaces/WasmModelInitResult.md)
