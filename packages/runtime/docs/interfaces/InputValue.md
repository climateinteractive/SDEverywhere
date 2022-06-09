[@sdeverywhere/runtime](../entry.md) / InputValue

# Interface: InputValue

Represents a writable model input.

## Properties

### callbacks

 **callbacks**: [`InputCallbacks`](InputCallbacks.md)

Callback functions that are called when the input value is changed.

___

### varId

 **varId**: `string`

The ID of the associated input variable, as used in SDEverywhere.

## Methods

### get

**get**(): `number`

Get the current value of the input.

#### Returns

`number`

___

### reset

**reset**(): `void`

Reset the input to its default value.

#### Returns

`void`

___

### set

**set**(`value`): `void`

Set the input to the given value.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number` |

#### Returns

`void`
