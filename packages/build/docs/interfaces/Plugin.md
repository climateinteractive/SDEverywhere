[@sdeverywhere/build](../index.md) / Plugin

# Interface: Plugin

The plugin interface that can be implemented to customize the model
generation and build process.

These functions are all optional.

These functions will be called during the build process in the order
listed below:
  - init (only called once before initial build steps)
  - preGenerate
      - preProcessMdl
      - postProcessMdl
      - preGenerateCode
      - postGenerateCode
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

`Optional` **preGenerate**(`context`, `modelSpec`): `Promise`<`void`\>

Called before the "generate model" steps are performed.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) | The build context (for logging, etc). |
| `modelSpec` | [`ResolvedModelSpec`](ResolvedModelSpec.md) | The spec that controls how the model is generated. |

#### Returns

`Promise`<`void`\>

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

### preGenerateCode

`Optional` **preGenerateCode**(`context`, `format`): `Promise`<`void`\>

Called before SDE generates a JS or C file from the mdl file.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) | The build context (for logging, etc). |
| `format` | ``"js"`` \| ``"c"`` | The generated code format, either 'js' or 'c'. |

#### Returns

`Promise`<`void`\>

___

### postGenerateCode

`Optional` **postGenerateCode**(`context`, `format`, `content`): `Promise`<`string`\>

Called after SDE generates a JS or C file from the mdl file.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) | The build context (for logging, etc). |
| `format` | ``"js"`` \| ``"c"`` | The generated code format, either 'js' or 'c'. |
| `content` | `string` | The resulting JS or C file content. |

#### Returns

`Promise`<`string`\>

The modified JS or C file content (if postprocessing was needed).

___

### postGenerate

`Optional` **postGenerate**(`context`, `modelSpec`): `Promise`<`boolean`\>

Called after the "generate model" process has completed (but before the staged
files are copied to their destination).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `context` | [`BuildContext`](../classes/BuildContext.md) | The build context (for logging, etc). |
| `modelSpec` | [`ResolvedModelSpec`](ResolvedModelSpec.md) | The spec that controls how the model is generated. |

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
| `modelSpec` | [`ResolvedModelSpec`](ResolvedModelSpec.md) | The spec that controls how the model is generated. |

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
