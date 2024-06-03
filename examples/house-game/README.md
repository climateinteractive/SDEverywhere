# house-game

This directory contains a web application built around a Vensim model that
together demonstrate how to develop a turn-based simulation "game" using
the SDEverywhere packages.

## Acknowledgements

The model used in this example is based on the "Real Estate Game" model
(`houses.mdl`) from the [Games in Vensim](https://vensim.com/documentation/usr11.html)
chapter of the [Vensim User Guide](https://vensim.com/documentation/users_guide.html).
There are some small differences (in constant values and model structure)
between the model in this example and the one in the Vensim User Guide, but
the concepts are largely the same.

## Notes

- The Vensim model is in `model/houses.mdl`.

- The `sde.config.js` file is used by the `sde` command line tool to generate
  a JavaScript version of the model, which is copied into the web app at build
  time (into the `packages/app/src/model/generated` directory).

- The web app is developed using the [Svelte](https://svelte.dev/) framework.
  See `packages/app/src/app.svelte` for the top-level `App` component.

- The code that runs the generated model is located in
  `packages/app/src/model/app-model.ts`. This code:
  1. passes the assumption and
     game parameters to the generated model as inputs
  2. runs the generated model asynchronously (in a Web Worker)
  3. makes the model
     outputs available to be displayed (and animated) in the main graph

## Quick Start

The quickest way to get started using the `house-game` example is to copy
it into a separate directory (outside of the `SDEverywhere` working copy).
This will allow you to install the `@sdeverywhere/*` packages using your
package manager of choice (npm, yarn, or pnpm).

```sh
# Change to the parent of your SDEverywhere working copy
cd <parentdir>

# Copy the example to a separate directory
cp -rf SDEverywhere/examples/house-game .

# Change to the copied directory
cd ./house-game

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
to use this `house-game` example to test your changes, you can use it directly
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
