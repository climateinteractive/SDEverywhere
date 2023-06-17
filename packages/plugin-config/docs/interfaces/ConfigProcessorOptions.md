[@sdeverywhere/plugin-config](../index.md) / ConfigProcessorOptions

# Interface: ConfigProcessorOptions

## Properties

### config

 **config**: `string`

The absolute path to the directory containing the CSV config files.

___

### out

 `Optional` **out**: `string` \| [`ConfigProcessorOutputPaths`](ConfigProcessorOutputPaths.md)

Either a single path to a base output directory (in which case, the recommended
directory structure will be used) or a `ConfigProcessorOutputPaths` containing specific paths.
If a single string is provided, the following subdirectories will be used:
  <out-dir>/
    src/
      config/
        generated/
      model/
        generated/
    strings/
