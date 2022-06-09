[@sdeverywhere/runtime](../entry.md) / Series

# Class: Series

A time series of data points for an output variable.

## Constructors

### constructor

**new Series**(`varId`, `points`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `varId` | `string` | The ID for the output variable (as used by SDEverywhere). |
| `points` | [`Point`](../interfaces/Point.md)[] | The data points for the variable, one point per time increment. |

## Properties

### points

 `Readonly` **points**: [`Point`](../interfaces/Point.md)[]

___

### varId

 `Readonly` **varId**: `string`

## Methods

### copy

**copy**(): [`Series`](Series.md)

Create a new `Series` instance that is a copy of this one.

#### Returns

[`Series`](Series.md)

___

### getValueAtTime

**getValueAtTime**(`time`): `number`

Return the Y value at the given time.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `time` | `number` | The x (time) value. |

#### Returns

`number`
