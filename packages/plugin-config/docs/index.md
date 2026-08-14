# @sdeverywhere/plugin-config

## Example

Example `sde.config.js` file:

```js
import { dirname, join as joinPath } from 'path'
import { fileURLToPath } from 'url'

import { configProcessor } from '@sdeverywhere/plugin-config'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function config() {
  return {
    // Specify the Vensim model to read
    modelFiles: ['example.mdl'],

    // Read csv files from the `config` directory and write to the recommended output
    // directory structure under the `core` package.  Note that the `config` and `out`
    // paths must be absolute.  See `ConfigProcessorOptions` for more details.
    modelSpec: configProcessor({
      config: joinPath(__dirname, 'config'),
      out: joinPath(__dirname, 'packages', 'core')
    }),

    plugins: [
      // ...
    ]
  }
}
```

## Initialization

- [configProcessor](functions/configProcessor.md)

## Options

- [ConfigProcessorOptions](interfaces/ConfigProcessorOptions.md)
- [ConfigProcessorOutputPaths](interfaces/ConfigProcessorOutputPaths.md)
