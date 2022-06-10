[@sdeverywhere/runtime](../index.md) / createInputValue

# Function: createInputValue

**createInputValue**(`varId`, `defaultValue`, `initialValue?`): [`InputValue`](../interfaces/InputValue.md)

Create a basic `InputValue` instance that notifies when a new value is set.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `varId` | `string` | The input variable ID, as used in SDEverywhere. |
| `defaultValue` | `number` | The default value of the input. |
| `initialValue?` | `number` | The inital value of the input; if undefined, will use `defaultValue`. |

#### Returns

[`InputValue`](../interfaces/InputValue.md)
