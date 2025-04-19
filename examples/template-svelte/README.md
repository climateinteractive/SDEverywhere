# template-svelte

This is a template that is used by the `@sdeverywhere/create` package to generate a
new project that uses SDEverywhere for a web application .

The project includes:

- a build process that converts a Vensim model to a JavaScript or WebAssembly
  module that can run the model in any web browser or in a Node.js application
- a `config` directory that contains CSV files for configuring the generated
  model and application
- a "core" package that provides a clean JavaScript / TypeScript API around the
  generated model
- an "app" package containing a Svelte-based web application that can be used
  to exercise the model
- a local development mode (`npm run dev`) that allows for rapid prototyping
  of the model and app
- a "model-check" setup that allows for running checks and comparison tests using
  the generated model

## Notes

- The simple Vensim model is in `model/MODEL_NAME.mdl`.

- The `sde.config.js` file is used by the `sde` command line tool to generate
  a JavaScript version of the model, which is copied into the `core` library
  package at build time (into the `packages/core/src/model/generated` directory).

- The web app is developed using the [Svelte](https://svelte.dev/) framework.
  See `packages/app/src/app.svelte` for the top-level `App` component.

## Quick Start

The quickest way to get started using the `multi-scenario` example is to copy
it into a separate directory (outside of the `SDEverywhere` working copy).
This will allow you to install the `@sdeverywhere/*` packages using your
package manager of choice (npm, yarn, or pnpm).

```sh
# Change to the parent of your SDEverywhere working copy
cd <parentdir>

# Copy the example to a separate directory
cp -rf SDEverywhere/examples/multi-scenario .

# Change to the copied directory
cd ./multi-scenario

# Install dependencies (you can also use yarn or pnpm here, if preferred)
npm install

# Enter development mode for the project.  This will start a live development
# environment that will refresh in the browser any time you make changes to
# the Vensim model file (in `model/houses.mdl`) or the app source code (in
# `packages/app/src`).
npm run dev
```

## For Developers

If you are modifying SDEverywhere (the packages in this repository) and want
to use this `multi-scenario` example to test your changes, you can use it directly
without copying to a separate directory (as in the instructions above).

Note that this example is already configured in `pnpm-workspace.yaml`, which
means that its dependencies (e.g., `@sdeverywhere/cli`) are already linked to
the ones from the `packages` directory in this repository; no separate linking
step is necessary.

The following assumes that you have already run `pnpm install` in the top-level
directory, and have built the local packages with `pnpm build`.

```sh
# Enter local development mode for the project (this uses `sde dev`)
pnpm dev
```

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
