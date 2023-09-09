[@sdeverywhere/plugin-check](../index.md) / CheckPluginOptions

# Interface: CheckPluginOptions

## Properties

### baseline

 `Optional` **baseline**: [`CheckBundle`](CheckBundle.md)

The baseline bundle.  If undefined, no comparison tests will be run.

___

### current

 `Optional` **current**: [`CheckBundle`](CheckBundle.md)

The current bundle, i.e., the bundle that is being developed and checked.

___

### testConfigPath

 `Optional` **testConfigPath**: `string`

The absolute path to the JS file containing the test configuration.  If undefined,
a default test configuration will be used.

___

### reportPath

 `Optional` **reportPath**: `string`

The absolute path to the directory where the report will be written.  If undefined,
the report will be written to the configured `prepDir`.

___

### serverPort

 `Optional` **serverPort**: `number`

The port used for the local dev server (defaults to 8081).
