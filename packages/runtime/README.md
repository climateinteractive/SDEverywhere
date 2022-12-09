# @sdeverywhere/runtime

This package provides a simplified API around a system dynamics model that
has been produced by [SDEverywhere](https://github.com/climateinteractive/SDEverywhere)
and compiled to a WebAssembly (Wasm) module via [Emscripten](https://emscripten.org).

## Usage

NOTE: If you use the `@sdeverywhere/create` package, most of the initialization
steps listed below are already handled for you in the generated `core` package,
and you can work directly with a `ModelRunner` and/or `ModelScheduler` instance.

### 1. Initialize the `WasmModel`

In your application, load the wasm module using the wrapper produced by
Emscripten, then pass it to `initWasmModelAndBuffers`.
This will create the `WasmModel` and `WasmBuffer` instances that will be
used in the next step to initalize the `ModelRunner`.

```ts
import { initWasmModelAndBuffers, WasmModelInitResult } from '@sdeverywhere/runtime'
import loadWasm from './generated/mymodel'

// These are the same lists (and must be in the same order) as the spec file passed to `sde`.
const inputVarNames = [] // from spec.json
const outputVarNames = [] // from spec.json

async function initWasmModel(): Promise<WasmModelInitResult> {
  // Load the wasm module asynchronously
  const wasmModule = await loadWasm()

  // Initialize the wasm model and its associated buffers
  return initWasmModelAndBuffers(wasmModule, inputVarNames.length, outputVarNames)
}
```

### 2. Initialize the `ModelRunner`

The next step is to create a `ModelRunner` instance, which simplifies
the process of running a `WasmModel` with a given set of inputs and
parsing the outputs.
The `ModelRunner` produces an `Outputs` instance that provides easy
access to time series data for each output variable in the model.
The `createWasmModelRunner` function is the simplest way to create
a `ModelRunner` that works with your `WasmModel`:

```ts
import { createWasmModelRunner, createInputValue, Outputs } from '@sdeverywhere/runtime'

async function main() {
  // Initialize the `WasmModel` and `ModelRunner`
  const wasmResult = await initWasmModel()
  const modelRunner = createWasmModelRunner(wasmResult)

  // Create a set of `InputValue` instances corresponding to the inputs in the spec.json file
  const inputs = [createInputValue('_input1', 2), createInputValue('_input2', 10)] // etc

  // Create an `Outputs` instance to hold the model outputs
  let outputs = modelRunner.createOutputs()

  // Run the model with those inputs
  outputs = await modelRunner.runModel(inputs, outputs)

  // Get the time series data and/or a specific value for a given output variable
  const series = outputs.getSeriesForVar('_temperature_change_from_1850')
  const tempChangeIn2100 = series.getValueAtTime(2100)
  console.log(`Temperature change in 2100: ${tempChangeIn2100}`)
```

See the `@sdeverywhere/runtime-async` package for an alternative
implementation of `ModelRunner` that allows for running a model in a Web
Worker or Node.js worker thread.

### 3. Initialize a `ModelScheduler` (optional)

If you build a more complex application with a user interface around a
model, the `ModelScheduler` class takes care of automatically scheduling
and running the model whenever there are changes to input variables:

```ts
import { ModelScheduler } from '@sdeverywhere/runtime'

async function initModel() {
  // Initialize the `WasmModel`, `ModelRunner`, inputs, and outputs as above
  const modelScheduler = new ModelScheduler(modelRunner, inputs, outputs)

  // Get notified when new output data is available
  modelScheduler.onOutputsChanged = newOutputs => {
    // Update the user interface to reflect the new output data, etc
  }

  // When you change the value of an input, the scheduler will automatically
  // run the model and call `onOutputsChanged` when new outputs are ready
  inputs[0].set(3)
}
```

## Emscripten Notes

If you use the `@sdeverywhere/plugin-wasm` package to build a WebAssembly
version of your model, the following steps are already handled for you.
The notes below are only needed if you want more low-level control over
how the C model is compiled into a WebAssembly module.

The `@sdeverywhere/runtime` package assumes you have created `<mymodel>.wasm`
and `<mymodel>.js` files with Emscripten.
The `emcc` command line options should be similar to the following:

```
$ emcc \
build/<mymodel>.c build/macros.c build/model.c build/vensim.c \
-Ibuild -o ./output/<mymodel>.js -Wall -Os \
-s STRICT=1 -s MALLOC=emmalloc -s FILESYSTEM=0 -s MODULARIZE=1 \
-s EXPORTED_FUNCTIONS="['_malloc','_getInitialTime','_getFinalTime','_getSaveper','_runModelWithBuffers']" \
-s EXPORTED_RUNTIME_METHODS="['cwrap']"
```

Note that the generated module must export the following functions at minimum:

- `_malloc`
- `_getInitialTime`
- `_getFinalTime`
- `_getSaveper`
- `_runModelWithBuffers`
- `cwrap`

## Documentation

API documentation is available in the [`docs`](./docs/index.md) directory.

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
