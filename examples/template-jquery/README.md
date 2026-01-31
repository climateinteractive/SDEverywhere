# template-jquery

This is a template that is used by the `@sdeverywhere/create` package to generate a
new project that uses SDEverywhere for a jQuery-based web application.

The project includes:

- a build process that converts a Vensim model to a JavaScript or WebAssembly
  module that can run the model in any web browser or in a Node.js application
- a `config` directory that contains CSV files for configuring the generated
  model and application
- a "core" package that provides a clean JavaScript / TypeScript API around the
  generated model
- an "app" package containing a simple JavaScript / jQuery-based web application
  that can be used to exercise the model
- a local development mode (`npm run dev`) that allows for rapid prototyping
  of the model and app
- a "model-check" setup that allows for running checks and comparison tests using
  the generated model

## Quick Start

```sh
# Create a new project (you can also use yarn or pnpm here, if preferred).
npm create @sdeverywhere@latest -- --template jquery

# Enter development mode for your model.  This will start a live
# development environment that will build a JavaScript version of the
# model and run checks on it any time you make changes to:
#   - the config files
#   - the Vensim model file (<name>.mdl)
#   - the model check definitions (model/checks/*.yaml)
#   - the model comparison definitions (model/comparisons/*.yaml)
npm run dev
```

## Notes

- The Vensim model is in `model/{MODEL_NAME}.mdl`.

- The `sde.config.js` file is used by the `sde` command line tool to generate
  a JavaScript version of the model, which is copied into the `core` package
  at build time (into the `packages/core/src/model/generated` directory).

- The web app is developed using the [jQuery](https://jquery.com/) framework.
  See `packages/app/src/index.js` for the code that initializes the UI.

- The code that runs the generated model is located in
  `packages/core/src/model/model.ts`. This code:
  1. passes the slider values to the generated model as inputs
  2. runs the generated model asynchronously (in a Web Worker)
  3. makes the model outputs available to be displayed (and animated) in the
     main graphs

## For Contributors

If you are modifying SDEverywhere (the packages in this repository) and want
to use this `template-jquery` example to test your changes, you can use it directly
without copying to a separate directory.

The template already includes the "SIR" Vensim model in `model/MODEL_NAME.mdl`
and associated graph and slider configuration in the `config` directory, so it
can be used right away without following the "Quick Start" instructions.

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
