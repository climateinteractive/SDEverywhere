# @sdeverywhere/plugin-config

## Example

Example `sde.config.js` file:

```js
import { configProcessor } from '@sdeverywhere/plugin-config'

export async function config() {
  return {
    // Specify the Vensim or Stella/XMILE model to read
    modelFiles: ['example.mdl'], // or ['example.stmx']

    // Read csv files from `config` directory and write to the recommended output
    // directory structure.  See `ConfigProcessorOptions` for more details.
    modelSpec: configProcessor({
      config: 'config'
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
