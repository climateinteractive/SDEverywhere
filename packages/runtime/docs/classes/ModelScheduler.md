[@sdeverywhere/runtime](../index.md) / ModelScheduler

# Class: ModelScheduler

A high-level interface that schedules the underlying `ModelRunner`.

When one or more input values are changed, this class will schedule a model
run to be completed as soon as possible.  When the model run has completed,
`onOutputsChanged` is called to notify that new output data is available.

The `ModelRunner` is pluggable to allow for running the model synchronously
(on the main JavaScript thread) or asynchronously (in a Web Worker or Node.js
worker thread).

## Constructors

### Constructor

> **new ModelScheduler**(`runner`, `userInputs`, `outputs`): `ModelScheduler`

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `runner` | [`ModelRunner`](../interfaces/ModelRunner.md) | The model runner. |
| `userInputs` | [`InputValue`](../interfaces/InputValue.md)[] | The input values, in the same order as in the spec file passed to `sde`. |
| `outputs` | [`Outputs`](Outputs.md) | The structure into which the model outputs will be stored. |

#### Returns

`ModelScheduler`

## Properties

### onOutputsChanged?

> `optional` **onOutputsChanged?**: (`outputs`) => `void`

Called when `outputs` has been updated after a model run.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `outputs` | [`Outputs`](Outputs.md) |

#### Returns

`void`
