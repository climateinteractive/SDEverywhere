[@sdeverywhere/build](../index.md) / BuildOptions

# Interface: BuildOptions

## Properties

### config

 `Optional` **config**: `string` \| [`UserConfig`](UserConfig.md)

The path to an `sde.config.js` file, or a `UserConfig` object.

___

### logLevels

 `Optional` **logLevels**: [`LogLevel`](../types/LogLevel.md)[]

The log levels to include.  If undefined, the default 'info' and 'error' levels
will be active.
