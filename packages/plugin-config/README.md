# @sdeverywhere/plugin-config

This package provides a plugin that reads CSV files used to configure a library or app
around an SDEverywhere-generated system dynamics model.

## Install

```sh
# npm
npm install --save-dev @sdeverywhere/plugin-config

# pnpm
pnpm add -D @sdeverywhere/plugin-config

# yarn
yarn add -D @sdeverywhere/plugin-config
```

## Usage

To get started:

1. Copy the included template config files to your local project:

```sh
cd your-model-project
npm install --save-dev @sdeverywhere/plugin-config
cp -rf "./node_modules/@sdeverywhere/plugin-config/template-config" ./config
```

2. Replace the placeholder values in the CSV files with values that are suitable for your model.

3. Add a line to your `sde.config.js` file that uses the `configProcessor` function supplied by this package:

```js
import { configProcessor } from '@sdeverywhere/plugin-config'

export async function config() {
  return {
    // Specify the Vensim model to read
    modelFiles: ['sample.mdl'],

    // Read csv files from `config` directory and write to the `generated` directory
    modelSpec: configProcessor({
      config: configDir,
      out: genDir
    }),

    plugins: [
      // ...
    ]
  }
}
```

4. Run `sde bundle` or `sde dev`; your config files will be used to drive the build process.

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
