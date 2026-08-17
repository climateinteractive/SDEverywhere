[@sdeverywhere/plugin-config](../index.md) / ConfigProcessorOptions

# Interface: ConfigProcessorOptions

## Properties

### config

> **config**: `string`

The absolute path to the directory containing the CSV config files.

***

### out?

> `optional` **out?**: `string` \| [`ConfigProcessorOutputPaths`](ConfigProcessorOutputPaths.md)

Either a single path to a base output directory (in which case, the recommended
directory structure will be used) or a `ConfigProcessorOutputPaths` containing specific paths.
If a single string is provided, the following subdirectories will be used:
```
  <out-dir>/
    src/
      config/
        generated/
      model/
        generated/
    strings/
```

***

### spec?

> `optional` **spec?**: [`ConfigProcessorSpec`](../type-aliases/ConfigProcessorSpec.md)

Additional model spec properties that cannot be derived from the CSV config files.

These are merged into the `ModelSpec` returned by the processor, which allows for
configuring settings like `directData` for which there is currently no
representation in the config files.
