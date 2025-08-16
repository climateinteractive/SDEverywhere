[@sdeverywhere/runtime](../index.md) / ModelContext

# Interface: ModelContext

Defines a context that holds a distinct set of model inputs and outputs.
These inputs and outputs are kept separate from those in other contexts,
which allows an application to use the same underlying model instance
with multiple sets of inputs and outputs.

## Properties

### onOutputsChanged

 `Optional` **onOutputsChanged**: () => `void`

#### Type declaration

(): `void`

Called when the outputs have been updated after a model run.

##### Returns

`void`

## Methods

### getSeriesForVar

**getSeriesForVar**(`varId`, `sourceName?`): [`Series`](../classes/Series.md)

Return the series data for the given model output variable or external
dataset.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `varId` | `string` | The ID of the output variable associated with the data. |
| `sourceName?` | `string` | The external data source name (e.g. "Ref"), or undefined to use the latest model output data from this context. |

#### Returns

[`Series`](../classes/Series.md)
