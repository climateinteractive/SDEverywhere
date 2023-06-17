[@sdeverywhere/runtime](../index.md) / InputValue

# Interface: InputValue

Represents a writable model input.

## Properties

### varId

 **varId**: `string`

The ID of the associated input variable, as used in SDEverywhere.

___

### get

 **get**: () => `number`

#### Type declaration

(): `number`

Get the current value of the input.

##### Returns

`number`

___

### set

 **set**: (`value`: `number`) => `void`

#### Type declaration

(`value`): `void`

Set the input to the given value.

##### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number` |

##### Returns

`void`

___

### reset

 **reset**: () => `void`

#### Type declaration

(): `void`

Reset the input to its default value.

##### Returns

`void`

___

### callbacks

 **callbacks**: [`InputCallbacks`](InputCallbacks.md)

Callback functions that are called when the input value is changed.
