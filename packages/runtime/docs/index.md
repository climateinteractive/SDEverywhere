# @sdeverywhere/runtime

## High-level Model API

### Runner and Scheduler

- [ModelRunner](interfaces/ModelRunner.md)
- [ModelScheduler](classes/ModelScheduler.md)
- [createWasmModelRunner](functions/createWasmModelRunner.md)

### Inputs

- [InputValue](interfaces/InputValue.md)
- [InputCallbacks](interfaces/InputCallbacks.md)
- [createInputValue](functions/createInputValue.md)

### Outputs

- [Outputs](classes/Outputs.md)
- [Series](classes/Series.md)
- [Point](interfaces/Point.md)

---

## Low-level Wasm Model API

- [WasmModel](classes/WasmModel.md)
- [WasmBuffer](classes/WasmBuffer.md)
- [WasmModule](interfaces/WasmModule.md)
- [WasmModelInitResult](interfaces/WasmModelInitResult.md)
- [initWasmModelAndBuffers](functions/initWasmModelAndBuffers.md)
