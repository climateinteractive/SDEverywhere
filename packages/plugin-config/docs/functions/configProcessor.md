[@sdeverywhere/plugin-config](../index.md) / configProcessor

# Function: configProcessor

**configProcessor**(`options`): (`buildContext`: `BuildContext`) => `Promise`<`ModelSpec`\>

Returns a function that can be passed as the `modelSpec` function for the SDEverywhere
`UserConfig`.  The returned function:
  - reads CSV files from a `config` directory
  - writes JS files to the configured output directories
  - returns a `ModelSpec` that guides the rest of the `sde` build process

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ConfigProcessorOptions`](../interfaces/ConfigProcessorOptions.md) |

#### Returns

`fn`

(`buildContext`): `Promise`<`ModelSpec`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `buildContext` | `BuildContext` |

##### Returns

`Promise`<`ModelSpec`\>
