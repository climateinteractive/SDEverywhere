[@sdeverywhere/runtime](../index.md) / InputValue

# Interface: InputValue

Represents a writable model input.

## Properties

### varId

> **varId**: `string`

The ID of the associated input variable, as used in SDEverywhere.

***

### get

> **get**: () => `number`

Get the current value of the input.

#### Returns

`number`

***

### set

> **set**: (`value`) => `void`

Set the input to the given value.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `number` |

#### Returns

`void`

***

### reset

> **reset**: () => `void`

Reset the input to its default value.

#### Returns

`void`

***

### callbacks

> **callbacks**: [`InputCallbacks`](InputCallbacks.md)

Callback functions that are called when the input value is changed.
