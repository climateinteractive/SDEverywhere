[@sdeverywhere/build](../index.md) / ResolvedConfig

# Interface: ResolvedConfig

The sde configuration derived from a `UserConfig` that has been resolved (i.e.,
paths have been checked).  This is the config object that will be passed to
plugin functions.  It contains a subset of the original `UserConfig` (to disallow
access to the `plugins` field of the original config).

## Properties

### mode

 **mode**: [`BuildMode`](../types/BuildMode.md)

The mode used for the build process, either 'development' or 'production'.

___

### rootDir

 **rootDir**: `string`

The absolute path to the project root directory, which has been confirmed to exist.

___

### prepDir

 **prepDir**: `string`

The absolute path to the directory used to prepare the model.  This directory has
been created if it did not previously exist.

___

### modelFiles

 **modelFiles**: `string`[]

The mdl files to be built.

___

### modelInputPaths

 **modelInputPaths**: `string`[]

Paths to files that are considered to be inputs to the model build process.
These can be paths to files or glob patterns (relative to the project directory).

___

### watchPaths

 **watchPaths**: `string`[]

Paths to files that when changed will trigger a rebuild in watch mode.  These
can be paths to files or glob patterns (relative to the project directory).

___

### genFormat

 **genFormat**: ``"js"`` \| ``"c"``

The code format to generate.  If 'js', the model will be compiled to a JavaScript
file.  If 'c', the model will be compiled to a C file (in which case an additional
plugin will be needed to convert the C code to a WebAssembly module).
