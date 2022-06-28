# @sdeverywhere/build

## Configuration

The `build` function expects either:

- a [UserConfig](interfaces/UserConfig.md) object, or
- a path to an `sde.config.js` file that exports a `config` function returning a [UserConfig](interfaces/UserConfig.md) object

Example `sde.config.js` file:

```js
export async function config() {
  return {
    modelFiles: ['example.mdl'],
    modelSpec: async () => {
      return {
        startTime: 2000,
        endTime: 2100,
        inputs: [{ varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }],
        outputs: [{ varName: 'Z' }],
        datFiles: []
      }
    }
  }
}
```

## Build API

- [build](functions/build.md)
- [BuildOptions](interfaces/BuildOptions.md)
- [BuildResult](interfaces/BuildResult.md)

# ModelSpec API

- [ModelSpec](interfaces/ModelSpec.md)
- [InputSpec](interfaces/InputSpec.md)
- [OutputSpec](interfaces/OutputSpec.md)

## Plugin API

- [Plugin](interfaces/Plugin.md)
- [BuildContext](classes/BuildContext.md)
- [ResolvedConfig](interfaces/ResolvedConfig.md)
