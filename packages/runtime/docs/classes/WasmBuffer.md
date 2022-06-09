[@sdeverywhere/runtime](../entry.md) / WasmBuffer

# Class: WasmBuffer

Wraps a `WebAssembly.Memory` buffer allocated on the wasm heap.

When this is used synchronously (in the browser's normal JavaScript thread),
the client can use `getArrayView` to write directly into the underlying memory.

Note, however, that `WebAssembly.Memory` buffers cannot be transferred to/from
a Web Worker.  When using this class in a worker thread, create a separate
`Float64Array` that can be transferred between the worker and the client running
in the browser's normal JS thread, and then use `getArrayView` to copy into and
out of the wasm buffer.

## Constructors

### constructor

**new WasmBuffer**(`wasmModule`, `numElements`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `wasmModule` | `WasmModule` | The `WasmModule` used to initialize the memory. |
| `numElements` | `number` | The number of 64-bit `double` elements in the buffer. |

## Properties

### byteOffset

 `Private` **byteOffset**: `number`

___

### heapArray

 `Private` **heapArray**: `Float64Array`

## Methods

### dispose

**dispose**(): `void`

Dispose the buffer by freeing the allocated heap memory.

#### Returns

`void`

___

### getArrayView

**getArrayView**(): `Float64Array`

#### Returns

`Float64Array`

A new `Float64Array` view on the underlying heap buffer.
