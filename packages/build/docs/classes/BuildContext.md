[@sdeverywhere/build](../index.md) / BuildContext

# Class: BuildContext

Provides access to common functionality that is needed during the build process.
This is passed to most plugin functions.

## Properties

### config

 `Readonly` **config**: [`ResolvedConfig`](../interfaces/ResolvedConfig.md)

## Methods

### log

**log**(`level`, `msg`): `void`

Log a message to the console and/or the in-browser overlay panel.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `level` | [`LogLevel`](../types/LogLevel.md) | The log level (verbose, info, error). |
| `msg` | `string` | The message. |

#### Returns

`void`

___

### prepareStagedFile

**prepareStagedFile**(`srcDir`, `srcFile`, `dstDir`, `dstFile`): `string`

Prepare for writing a file to the staged directory.

This will add the path to the array of tracked files and will create the
staged directory if needed.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `srcDir` | `string` | The directory underneath the configured `staged` directory where the file will be written (this must be a relative path). |
| `srcFile` | `string` | The name of the file as written to the `staged` directory. |
| `dstDir` | `string` | The absolute path to the destination directory where the staged file will be copied when the build has completed. |
| `dstFile` | `string` | The name of the file as written to the destination directory. |

#### Returns

`string`

The absolute path to the staged file.

___

### writeStagedFile

**writeStagedFile**(`srcDir`, `dstDir`, `filename`, `content`): `void`

Write a file to the staged directory.

This file will be copied (along with other staged files) into the destination
directory only after the build process has completed.  Copying all staged files
at once helps improve the local development experience by making it so that
live reloading tools only need to refresh once instead of every time a build
file is written.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `srcDir` | `string` | The directory underneath the configured `staged` directory where the file will be written (this must be a relative path). |
| `dstDir` | `string` | The absolute path to the destination directory where the staged file will be copied when the build has completed. |
| `filename` | `string` | The name of the file. |
| `content` | `string` | The file content. |

#### Returns

`void`

___

### spawnChild

**spawnChild**(`cwd`, `command`, `args`, `opts?`): `Promise`<`ProcessOutput`\>

Spawn a child process that runs the given command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cwd` | `string` | The directory in which the command will be executed. |
| `command` | `string` | The command to execute. |
| `args` | `string`[] | The arguments to pass to the command. |
| `opts?` | `ProcessOptions` | Additional options to configure the process. |

#### Returns

`Promise`<`ProcessOutput`\>

The output of the process.
