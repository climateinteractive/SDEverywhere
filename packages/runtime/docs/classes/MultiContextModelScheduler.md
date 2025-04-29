[@sdeverywhere/runtime](../index.md) / MultiContextModelScheduler

# Class: MultiContextModelScheduler

A high-level interface that schedules running of the underlying `ModelRunner`.

This class is similar to the (single context) `ModelScheduler` class, except
this one supports multiple contexts, each with its own distinct set of
inputs and outputs.  This is useful for running the same underlying model
instance with different sets of inputs and outputs.  For example, you can
use this to show the outputs for multiple scenarios in a single graph, or
multiple scenarios across different graphs.

When input values are changed in one or more contexts, this class will schedule
a model run for each changed context to be completed as soon as possible.
When the model run has completed, the context's `onOutputsChanged` function
is called to notify that new output data is available for that context.

The `ModelRunner` is pluggable to allow for running the model synchronously
(on the main JavaScript thread) or asynchronously (in a Web Worker or Node.js
worker thread).

## Constructors

### constructor

**new MultiContextModelScheduler**(`runner`, `options?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `runner` | [`ModelRunner`](../interfaces/ModelRunner.md) | The model runner. |
| `options?` | `Object` | Additional options for the scheduler. |
| `options.initialOutputs?` | [`Outputs`](Outputs.md) | An optional `Outputs` instance that will be reused for the initial context. This is useful for saving memory when an `Outputs` instance was already created for, e.g., a initial baseline/reference run. |

## Methods

### isStarted

**isStarted**(): `boolean`

Return true if the scheduler has started any model runs.

#### Returns

`boolean`

___

### addContext

**addContext**(`inputs`, `options?`): [`ModelContext`](../interfaces/ModelContext.md)

Add a new context that holds a distinct set of model inputs and outputs.
These inputs and outputs are kept separate from those in other contexts,
which allows an application to use the same underlying model to run with
multiple I/O contexts.

Note that the contexts created before the first scheduled model run
will inherit the data from `initialOutputs` passed to the constructor,
but contexts created after that will initially have output values set
to zero.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `inputs` | [`InputValue`](../interfaces/InputValue.md)[] | The input values, in the same order as in the spec file passed to `sde`. |
| `options?` | `Object` | Additional options for the context. |
| `options.externalData?` | [`DataMap`](../types/DataMap.md) | Additional data that is external to the model outputs. For example, this can contain data that was captured from an initial reference run, or other static data that is displayed in graphs alongside the model output data in graphs. |

#### Returns

[`ModelContext`](../interfaces/ModelContext.md)

___

### removeContext

**removeContext**(`context`): `void`

Remove the given context from the set of contexts managed by the scheduler.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`ModelContext`](../interfaces/ModelContext.md) | The context to remove. |

#### Returns

`void`
