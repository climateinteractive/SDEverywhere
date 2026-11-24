[@sdeverywhere/runtime](../index.md) / Series

# Class: Series

A time series of data points for an output variable.

## Constructors

### Constructor

> **new Series**(`varId`, `points`): `Series`

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `varId` | `string` | The ID for the output variable (as used by SDEverywhere). |
| `points` | [`Point`](../interfaces/Point.md)[] | The data points for the variable, one point per time increment. |

#### Returns

`Series`

## Properties

### varId

> `readonly` **varId**: `string`

The ID for the output variable (as used by SDEverywhere).

***

### points

> `readonly` **points**: [`Point`](../interfaces/Point.md)[]

The data points for the variable, one point per time increment.

## Methods

### getValueAtTime()

> **getValueAtTime**(`time`): `number`

Return the Y value at the given time.  Note that this does not attempt to interpolate
if there is no data point defined for the given time and will return undefined in
that case.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `time` | `number` | The x (time) value. |

#### Returns

`number`

The y value for the given time, or undefined if there is no data point defined
for the given time.

***

### copy()

> **copy**(): `Series`

Create a new `Series` instance that is a copy of this one.

#### Returns

`Series`
