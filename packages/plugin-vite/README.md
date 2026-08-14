# @sdeverywhere/plugin-vite

This package provides a plugin that uses Vite and a given Vite configuration file to bundle an application or library as part of the [SDEverywhere](https://github.com/climateinteractive/SDEverywhere) builder process (i.e., `sde bundle` or `sde dev`).

## Quick Start

The best way to get started with SDEverywhere is to follow the [Quick Start](https://github.com/climateinteractive/SDEverywhere#quick-start) instructions.
If you follow those instructions, the `@sdeverywhere/plugin-vite` package will be added to your project automatically, in which case you can skip the next section and jump straight to the ["Usage"](#usage) section below.

## Install

```sh
# npm
npm install --save-dev @sdeverywhere/plugin-vite

# pnpm
pnpm add -D @sdeverywhere/plugin-vite

# yarn
yarn add -D @sdeverywhere/plugin-vite
```

## Usage

_Note:_ If you followed the "Quick Start" instructions above and/or are using one of the standard project templates provided by SDEverywhere, the `sde.config.js` file should already be set up to use `plugin-vite`.
Reading these instructions can still be helpful if you are setting up a project manually or want to understand how `plugin-vite` can be integrated into your project.

### Why use this plugin?

Most SDEverywhere projects include an application (or a library) that is built around the generated model.
Rather than running `sde bundle` and `vite build` as two separate steps, this plugin folds the Vite build into the `sde` build process, which means:

- your app is rebuilt automatically whenever the model is regenerated; and
- in development mode (`sde dev`), a single command starts a Vite dev server that reloads the app when either the model or your app sources change.

The plugin does not replace your Vite configuration; it simply runs Vite using the config you provide.

### Steps

1. Add `@sdeverywhere/plugin-vite` as a project "dev" dependency:

```sh
cd your-model-project
npm install --save-dev @sdeverywhere/plugin-vite
```

2. Update your `sde.config.js` file to use `vitePlugin`. Both the `name` (used in log messages) and `config` (the Vite config) options are required:

```js
import { dirname, join as joinPath } from 'path'
import { fileURLToPath } from 'url'

import { vitePlugin } from '@sdeverywhere/plugin-vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appPath = (...parts) => joinPath(__dirname, 'packages', 'app', ...parts)

export async function config() {
  return {
    modelFiles: ['model/example.mdl'],

    // ...

    plugins: [
      // ...

      // Build or serve the model explorer app
      vitePlugin({
        name: 'app',
        apply: {
          // Run the Vite dev server when `sde dev` is used
          development: 'serve'
        },
        config: {
          configFile: appPath('vite.config.js')
        }
      })
    ]
  }
}
```

3. Run `sde bundle` to build your app, or `sde dev` to serve it locally with live reload.

### Choosing the `apply` behavior

The `apply` option controls when (and how) Vite runs for each `sde` build mode.
Both `apply.development` and `apply.production` default to `'post-build'`.

For a **web application** that you want to view while you work on the model, use `'serve'` in development mode.
Vite starts a dev server and refreshes the browser when changes are detected:

```js
vitePlugin({
  name: 'app',
  apply: {
    development: 'serve'
  },
  config: {
    configFile: appPath('vite.config.js')
  }
})
```

For a **library** that other packages depend on (for example, a `core` package that wraps the generated model), use `'watch'` in development mode so that Vite rebuilds the library whenever its sources change:

```js
vitePlugin({
  name: 'core',
  apply: {
    development: 'watch'
  },
  config: {
    configFile: corePath('vite.config.js')
  }
})
```

The full set of values is:

| Value             | Development | Production | Behavior                                                 |
| ----------------- | :---------: | :--------: | -------------------------------------------------------- |
| `'skip'`          |      ✓      |     ✓      | Don't run the plugin.                                    |
| `'post-generate'` |      ✓      |     ✓      | Run `vite build` in the `postGenerate` phase.            |
| `'post-build'`    |      ✓      |     ✓      | Run `vite build` in the `postBuild` phase (the default). |
| `'watch'`         |      ✓      |            | Run `vite build` in watch mode; useful for libraries.    |
| `'serve'`         |      ✓      |            | Run the Vite dev server; useful for applications.        |

Use `'post-generate'` when a later plugin needs the output of this Vite build; use `'post-build'` (the default) otherwise.

### Using more than one instance

A project can include as many `vitePlugin` instances as it needs; give each one a distinct `name` so that log messages are easy to follow.
Because plugins run in order, list a library before the app that depends on it:

```js
plugins: [
  // Build the `core` library that wraps the generated model
  vitePlugin({
    name: 'core',
    apply: { development: 'watch' },
    config: { configFile: corePath('vite.config.js') }
  }),

  // Build or serve the app that depends on the `core` library
  vitePlugin({
    name: 'app',
    apply: { development: 'serve' },
    config: { configFile: appPath('vite.config.js') }
  })
]
```

### Providing the Vite config inline

The `config` option is a Vite [`InlineConfig`](https://vite.dev/config/), so you can define the configuration directly in `sde.config.js` instead of pointing at a separate config file:

```js
vitePlugin({
  name: 'app',
  config: {
    configFile: false,
    root: appPath(),
    build: {
      outDir: appPath('dist'),
      emptyOutDir: true
    }
  }
})
```

## Documentation

API documentation (for plugin configuration options) is available in the [`docs`](./docs/index.md) directory.

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
