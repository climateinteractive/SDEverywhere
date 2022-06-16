# @sdeverywhere/build

## Configuration

The `build` function expects either:

- a [UserConfig](interfaces/UserConfig.md) object, or
- a path to an `sde.config.js` file that exports a `config` function returning a [UserConfig](interfaces/UserConfig.md) object

Example `sde.config.js` file:

```js
export async function config() {
  return {
    modelFiles: ['example.mdl']
  }
}
```

## Build API

- [build](functions/build.md)
- [BuildOptions](interfaces/BuildOptions.md)
- [BuildResult](interfaces/BuildResult.md)

## Plugin API

- [Plugin](interfaces/Plugin.md)
- [ModelSpec](interfaces/ModelSpec.md)
- [BuildContext](classes/BuildContext.md)
- [ResolvedConfig](interfaces/ResolvedConfig.md)
