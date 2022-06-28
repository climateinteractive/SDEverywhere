# hello-world

This package contains a simple Vensim model and associated tests that can be
used to exercise the `sde` command line tool.

## Quick Start

The quickest way to get started using the `hello-world` example is to copy
it into a separate directory (outside of the `SDEverywhere` working copy).
This will allow you to install the `@sdeverywhere/*` packages using your
package manager of choice (npm, yarn, or pnpm).

```sh
# Change to the parent of your SDEverywhere working copy
cd <parentdir>

# Copy the example to a separate directory
cp -rf SDEverywhere/examples/hello-world .

# Change to the copied directory
cd ./hello-world

# Install dependencies (you can also use yarn or pnpm here, if preferred)
npm install

# Enter development mode for the sample model.  This will start a live
# development environment that will build a WebAssembly version of the
# sample model and run checks on it any time you make changes to the
# Vensim model file (sample.mdl) or the checks file (sample.check.yaml).
npm run dev
```

## For Developers

If you are modifying SDEverywhere (the packages in this repository) and want
to use this `hello-world` example to test your changes, you can use it directly
without copying to a separate directory (as in the instructions above).

Note that this example is already configured in `pnpm-workspace.yaml`, which
means that its dependencies (e.g., `@sdeverywhere/cli`) are already linked to
the ones from the `packages` directory in this repository; no separate linking
step is necessary.

The following assumes that you have already run `pnpm install` in the top-level
directory, and have built the local packages with `pnpm build`.

```sh
# Enter local development mode for the sample model (this uses `sde dev`)
pnpm dev

# Or, build the model, run the checks (on the command line), and generate
# the model-check report (this uses `sde bundle`)
pnpm build

# Open the generated report in a browser
pnpm serve
```

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
