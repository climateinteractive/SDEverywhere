[@sdeverywhere/runtime](../index.md) / createLookupDef

# Function: createLookupDef

**createLookupDef**(`varRef`, `points`): [`LookupDef`](../interfaces/LookupDef.md)

Create a `LookupDef` instance from the given array of `Point` objects.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `varRef` | [`VarRef`](../interfaces/VarRef.md) | The reference to the lookup or data variable to be modified. |
| `points` | [`Point`](../interfaces/Point.md)[] | The lookup data as an array of `Point` objects. This can be undefined, in which case the lookup data will be reset to the original data. |

#### Returns

[`LookupDef`](../interfaces/LookupDef.md)
