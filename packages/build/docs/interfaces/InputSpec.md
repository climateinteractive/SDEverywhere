[@sdeverywhere/build](../index.md) / InputSpec

# Interface: InputSpec

Describes a model input variable.

## Properties

### inputId

 `Optional` **inputId**: `string`

The stable input identifier.  It is recommended to set this to a value (for example, a
numeric string like what `plugin-config` uses) that is separate from `varName` and is
stable between two versions of the model.  This way, if an input variable is renamed
between two versions of the model, comparisons can still be performed between the two.
If a distinct `inputId` is not available, plugins can infer one from `varName`, but
note that this approach will be less resilient to renames.

___

### varName

 **varName**: `string`

The variable name (as used in the modeling tool).

___

### defaultValue

 **defaultValue**: `number`

The default value for the input.

___

### minValue

 **minValue**: `number`

The minimum value for the input.

___

### maxValue

 **maxValue**: `number`

The maximum value for the input.
