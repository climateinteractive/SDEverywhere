[@sdeverywhere/build](../index.md) / BuildOptions

# Interface: BuildOptions

## Properties

### config?

> `optional` **config?**: `string` \| [`UserConfig`](UserConfig.md)

The path to an `sde.config.js` file, or a `UserConfig` object.

***

### logLevels?

> `optional` **logLevels?**: [`LogLevel`](../type-aliases/LogLevel.md)[]

The log levels to include.  If undefined, the default 'info' and 'error' levels
will be active.
