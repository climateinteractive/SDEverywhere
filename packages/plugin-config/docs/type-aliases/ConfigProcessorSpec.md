[@sdeverywhere/plugin-config](../index.md) / ConfigProcessorSpec

# Type Alias: ConfigProcessorSpec

> **ConfigProcessorSpec** = `Omit`\<`ModelSpec`, `"inputs"` \| `"outputs"` \| `"datFiles"` \| `"bundleListing"` \| `"customConstants"` \| `"customLookups"` \| `"customOutputs"` \| `"options"`\>

The model spec properties that can be provided using the `spec` field of
`ConfigProcessorOptions`.

This is the full `ModelSpec` type from the build package, minus the properties that
are determined by the CSV config files (and would therefore be overwritten), and minus
the deprecated `options` escape hatch.
