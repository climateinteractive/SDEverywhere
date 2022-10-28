[@sdeverywhere/build](../index.md) / BuildResult

# Interface: BuildResult

## Properties

### exitCode

 `Optional` **exitCode**: `number`

The exit code that should be set by the process.  This will be undefined
if `mode` is 'development', indicating that the process should be kept alive.
