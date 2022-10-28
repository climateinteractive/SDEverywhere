[@sdeverywhere/build](../index.md) / build

# Function: build

**build**(`mode`, `options`): `Promise`<`Result`<[`BuildResult`](../interfaces/BuildResult.md), `Error`\>\>

Initiate the build process, which can either be a single build if `mode` is
'production', or a live development environment if `mode` is 'development'.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `mode` | [`BuildMode`](../types/BuildMode.md) | The build mode. |
| `options` | [`BuildOptions`](../interfaces/BuildOptions.md) | The build options. |

#### Returns

`Promise`<`Result`<[`BuildResult`](../interfaces/BuildResult.md), `Error`\>\>

An `ok` result if the build completed, otherwise an `err` result.
