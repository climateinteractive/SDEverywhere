[@sdeverywhere/runtime](../index.md) / Outputs

# Class: Outputs

Represents the outputs from a model run.

## Constructors

### Constructor

> **new Outputs**(`varIds`, `startTime`, `endTime`, `saveFreq?`): `Outputs`

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `varIds` | `string`[] | `undefined` | The output variable identifiers. |
| `startTime` | `number` | `undefined` | The start time for the model. |
| `endTime` | `number` | `undefined` | The end time for the model. |
| `saveFreq` | `number` | `1` | The frequency with which output values are saved (aka `SAVEPER`). |

#### Returns

`Outputs`

## Properties

### seriesLength

> `readonly` **seriesLength**: `number`

The number of data points in each series.

***

### varSeries

> `readonly` **varSeries**: [`Series`](Series.md)[]

The array of series, one for each output variable.

***

### varIds

> `readonly` **varIds**: `string`[]

The output variable identifiers.

***

### startTime

> `readonly` **startTime**: `number`

The start time for the model.

***

### endTime

> `readonly` **endTime**: `number`

The end time for the model.

***

### saveFreq

> `readonly` **saveFreq**: `number` = `1`

The frequency with which output values are saved (aka `SAVEPER`).

## Methods

### updateFromBuffer()

> **updateFromBuffer**(`outputsBuffer`, `rowLength`): `Result`\<`void`, `"invalid-point-count"`\>

Parse the given raw float buffer (produced by the model) and store the values
into this `Outputs` instance.

Note that the length of `outputsBuffer` must be greater than or equal to
the capacity of this `Outputs` instance.  The `Outputs` instance is allowed
to be smaller to support the case where you want to extract a subset of
the time range in the buffer produced by the model.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `outputsBuffer` | `Float64Array` | The raw outputs buffer produced by the model. |
| `rowLength` | `number` | The number of elements per row (one element per save point). |

#### Returns

`Result`\<`void`, `"invalid-point-count"`\>

An `ok` result if the buffer is valid, otherwise an `err` result.

***

### getSeriesForVar()

> **getSeriesForVar**(`varId`): [`Series`](Series.md)

Return the series for the given output variable.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `varId` | `string` | The ID of the output variable (as used by SDEverywhere). |

#### Returns

[`Series`](Series.md)
