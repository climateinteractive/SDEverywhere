[@sdeverywhere/build](../index.md) / ModelSpec

# Interface: ModelSpec

Describes a model (e.g., a Vensim mdl file) and the input/output variables
that should be included in the model generated by SDE.

## Properties

### startTime

 **startTime**: `number`

The start time (year) for the model (typically the same as `INITIAL TIME`).

___

### endTime

 **endTime**: `number`

The end time (year) for the model (typically the same as `FINAL TIME`).

___

### inputVarNames

 **inputVarNames**: `string`[]

The input variable names (the longform names used in the modeling tool).

___

### outputVarNames

 **outputVarNames**: `string`[]

The output variable names (the longform names used in the modeling tool).

___

### datFiles

 **datFiles**: `string`[]

The dat files to be included with the SDE `spec.json` file.

___

### options

 `Optional` **options**: `Object`

Additional options included with the SDE `spec.json` file.

#### Index signature

▪ [key: `string`]: `any`