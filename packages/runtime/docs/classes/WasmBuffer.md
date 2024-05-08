[@sdeverywhere/runtime](../index.md) / WasmBuffer

# Class: WasmBuffer<ArrType\>

Wraps a `WebAssembly.Memory` buffer allocated on the wasm heap.

When this is used synchronously (in the browser's normal JavaScript thread),
the client can use `getArrayView` to write directly into the underlying memory.

Note, however, that `WebAssembly.Memory` buffers cannot be transferred to/from
a Web Worker.  When using this class in a worker thread, create a separate
`Float64Array` that can be transferred between the worker and the client running
in the browser's normal JS thread, and then use `getArrayView` to copy into and
out of the wasm buffer.

## Type parameters

| Name |
| :------ |
| `ArrType` |

## Constructors

### constructor

**new WasmBuffer**<`ArrType`\>(`wasmModule`, `numElements`, `byteOffset`, `heapArray`)

#### Type parameters

| Name |
| :------ |
| `ArrType` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `wasmModule` | [`WasmModule`](../interfaces/WasmModule.md) | The `WasmModule` used to initialize the memory. |
| `numElements` | `number` | The number of elements in the buffer. |
| `byteOffset` | `number` | The byte offset within the wasm heap. |
| `heapArray` | `ArrType` | The array view on the underlying heap buffer. |

## Properties

### numElements

 **numElements**: `number`

The number of elements in the buffer.

## Methods

### getArrayView

**getArrayView**(): `ArrType`

#### Returns

`ArrType`

An `ArrType` view on the underlying heap buffer.

___

### dispose

**dispose**(): `void`

Dispose the buffer by freeing the allocated heap memory.

#### Returns

`void`
