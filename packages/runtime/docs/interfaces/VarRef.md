[@sdeverywhere/runtime](../index.md) / VarRef

# Interface: VarRef

A reference to a variable in the generated model.  A variable can be identified
using either a `VarName` (the variable name, as used in the modeling tool) or a
`VarId` (the variable identifier, as used in model code generated by SDEverywhere).

## Properties

### varName

 `Optional` **varName**: `string`

The name of the variable, as used in the modeling tool.  If defined, the implementation
will use this to identify the variable, and will ignore the `varId` property.

___

### varId

 `Optional` **varId**: `string`

The identifier of the variable, as used in model code generated by SDEverywhere.  If
defined, the implementation will use this to identify the variable, and will ignore
the `varName` property.