[@sdeverywhere/build](../index.md) / UserConfig

# Interface: UserConfig

The sde configuration as defined by the user, either inline or in a `sde.config.js` file.

## Properties

### rootDir

 `Optional` **rootDir**: `string`

The project root directory.  If undefined, the current directory is
assumed to be the project root.  This directory should contain all the
model and config files referenced during the build process.

___

### prepDir

 `Optional` **prepDir**: `string`

The directory used to prepare the model.  If undefined, an 'sde-prep'
directory will be created under the resolved `rootDir`.

___

### modelFiles

 **modelFiles**: `string`[]

The mdl files to be built (must provide one or more).

___

### modelInputPaths

 `Optional` **modelInputPaths**: `string`[]

Paths to files that are considered to be inputs to the model build process.
These can be paths to files or glob patterns (relative to the project directory).
If left undefined, this will resolve to the `modelFiles` array.

___

### watchPaths

 `Optional` **watchPaths**: `string`[]

Paths to files that when changed will trigger a rebuild in watch mode.  These
can be paths to files or glob patterns (relative to the project directory).
If left undefined, this will resolve to the `modelFiles` array.

___

### genFormat

 `Optional` **genFormat**: ``"js"`` \| ``"c"``

The code format to generate.  If 'js', the model will be compiled to a JavaScript
file.  If 'c', the model will be compiled to a C file (in which case an additional
plugin will be needed to convert the C code to a WebAssembly module).  If undefined,
defaults to 'js'.

___

### plugins

 `Optional` **plugins**: [`Plugin`](Plugin.md)[]

The array of plugins that are used to customize the build process.  These will be
executed in the order defined here.

___

### modelSpec

 **modelSpec**: (`context`: [`BuildContext`](../classes/BuildContext.md)) => `Promise`<[`ModelSpec`](ModelSpec.md)\>

#### Type declaration

(`context`): `Promise`<[`ModelSpec`](ModelSpec.md)\>

Called before the "generate model" steps are performed.

You must implement this function so that the generated model is
configured with the desired inputs and outputs.

##### Parameters

| Name | Type |
| :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) |

##### Returns

`Promise`<[`ModelSpec`](ModelSpec.md)\>

A `ModelSpec` that defines the model inputs and outputs.
