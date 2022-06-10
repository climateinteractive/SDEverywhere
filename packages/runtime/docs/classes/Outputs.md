[@sdeverywhere/runtime](../index.md) / Outputs

# Class: Outputs

Represents the outputs from a model run.

## Properties

### seriesLength

 `Readonly` **seriesLength**: `number`

The number of data points in each series.

___

### varSeries

 `Readonly` **varSeries**: [`Series`](Series.md)[]

The array of series, one for each output variable.

___

### varIds

 `Readonly` **varIds**: `string`[]

___

### timeStart

 `Readonly` **timeStart**: `number`

___

### timeEnd

 `Readonly` **timeEnd**: `number`

## Constructors

### constructor

**new Outputs**(`varIds`, `timeStart`, `timeEnd`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `varIds` | `string`[] |
| `timeStart` | `number` |
| `timeEnd` | `number` |

## Methods

### updateFromBuffer

**updateFromBuffer**(`outputsBuffer`, `rowLength`): `Result`<`void`, ``"invalid-point-count"``\>

Parse the given raw float buffer (produced by the model) and store the values
into this `Outputs` instance.

Note that the length of `outputsBuffer` must be greater than or equal to
the capacity of this `Outputs` instance.  The `Outputs` instance is allowed
to be smaller to support the case where you want to extract a subset of
the time range in the buffer produced by the model.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `outputsBuffer` | `Float64Array` | The raw outputs buffer produced by the model. |
| `rowLength` | `number` | The number of elements per row (one element per year or save point). |

#### Returns

`Result`<`void`, ``"invalid-point-count"``\>

An `ok` result if the buffer is valid, otherwise an `err` result.

___

### getSeriesForVar

**getSeriesForVar**(`varId`): [`Series`](Series.md)

Return the series for the given output variable.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `varId` | `string` | The ID of the output variable (as used by SDEverywhere). |

#### Returns

[`Series`](Series.md)
