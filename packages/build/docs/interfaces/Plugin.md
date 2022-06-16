[@sdeverywhere/build](../index.md) / Plugin

# Interface: Plugin

The plugin interface that can be implemented to customize the model
generation and build process.

These functions are all optional.

NOTE: Currently it is required to have exactly one plugin in the chain
that implements the `preGenerate` function because that function provides
information that is used to drive the rest of the build process.

These functions will be called during the build process in the order
listed below:
  - init (only called once before initial build steps)
  - preGenerate
      - preProcessMdl
      - postProcessMdl
      - preGenerateC
      - postGenerateC
  - postGenerate
  - postBuild
  - watch (only called once after initial build steps when mode==development)

## Methods

### init

`Optional` **init**(`config`): `Promise`<`void`\>

Called after the user configuration has been resolved, but before the
model is generated and other build steps.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`ResolvedConfig`](ResolvedConfig.md) | The build configuration. |

#### Returns

`Promise`<`void`\>

___

### preGenerate

`Optional` **preGenerate**(`context`): `Promise`<[`ModelSpec`](ModelSpec.md)\>

Called before the "generate model" steps are performed.

You must implement this function so that the generated model is
configured with the desired inputs and outputs.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) | The build context (for logging, etc). |

#### Returns

`Promise`<[`ModelSpec`](ModelSpec.md)\>

A `ModelSpec` that defines the model inputs and outputs.

___

### preProcessMdl

`Optional` **preProcessMdl**(`context`): `Promise`<`void`\>

Called before SDE preprocesses the mdl file (in the case of one mdl file),
or before SDE flattens the mdl files (in the case of multiple mdl files).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) | The build context (for logging, etc). |

#### Returns

`Promise`<`void`\>

___

### postProcessMdl

`Optional` **postProcessMdl**(`context`, `mdlContent`): `Promise`<`string`\>

Called after SDE preprocesses the mdl file (in the case of one mdl file),
or after SDE flattens the mdl files (in the case of multiple mdl files).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) | The build context (for logging, etc). |
| `mdlContent` | `string` | The resulting mdl file content. |

#### Returns

`Promise`<`string`\>

The modified mdl file content (if postprocessing was needed).

___

### preGenerateC

`Optional` **preGenerateC**(`context`): `Promise`<`void`\>

Called before SDE generates a C file from the mdl file.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) | The build context (for logging, etc). |

#### Returns

`Promise`<`void`\>

___

### postGenerateC

`Optional` **postGenerateC**(`context`, `cContent`): `Promise`<`string`\>

Called after SDE generates a C file from the mdl file.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) | The build context (for logging, etc). |
| `cContent` | `string` | The resulting C file content. |

#### Returns

`Promise`<`string`\>

The modified C file content (if postprocessing was needed).

___

### postGenerate

`Optional` **postGenerate**(`context`, `modelSpec`): `Promise`<`boolean`\>

Called after the "generate model" process has completed (but before the staged
files are copied to their destination).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) | The build context (for logging, etc). |
| `modelSpec` | [`ModelSpec`](ModelSpec.md) | The spec that controls how the model is generated. |

#### Returns

`Promise`<`boolean`\>

Whether the plugin succeeded (for example, a plugin that runs tests can
return false to indicate that one or more tests failed).

___

### postBuild

`Optional` **postBuild**(`context`, `modelSpec`): `Promise`<`boolean`\>

Called after the model has been generated and after the staged files
have been copied to their destination.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) | The build context (for logging, etc). |
| `modelSpec` | [`ModelSpec`](ModelSpec.md) | The spec that controls how the model is generated. |

#### Returns

`Promise`<`boolean`\>

Whether the plugin succeeded (for example, a plugin that runs tests can
return false to indicate that one or more tests failed).

___

### watch

`Optional` **watch**(`config`): `Promise`<`void`\>

Called in development/watch mode after the initial build has completed
(i.e., after the model has been generated and after the staged files
have been copied to their destination).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`ResolvedConfig`](ResolvedConfig.md) | The build configuration. |

#### Returns

`Promise`<`void`\>
