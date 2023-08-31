[@sdeverywhere/runtime](../index.md) / Outputs

# Class: Outputs

Represents the outputs from a model run.

## Constructors

### constructor

**new Outputs**(`varIds`, `startTime`, `endTime`, `saveFreq?`)

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `varIds` | `string`[] | `undefined` | The output variable identifiers. |
| `startTime` | `number` | `undefined` | The start time for the model. |
| `endTime` | `number` | `undefined` | The end time for the model. |
| `saveFreq` | `number` | `1` | The frequency with which output values are saved (aka `SAVEPER`). |

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

The output variable identifiers.

___

### startTime

 `Readonly` **startTime**: `number`

The start time for the model.

___

### endTime

 `Readonly` **endTime**: `number`

The end time for the model.

___

### saveFreq

 `Readonly` **saveFreq**: `number` = `1`

The frequency with which output values are saved (aka `SAVEPER`).

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
| `rowLength` | `number` | The number of elements per row (one element per save point). |

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
