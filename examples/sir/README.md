# sir

This example directory contains the classic SIR (Susceptible-Infectious-Recovered) model of
infectious disease.
It is intended to demonstrate the use of the `@sdeverywhere/create` package to quickly
set up a new project that uses the provided config files to generate a simple web application.

## Quick Start

The quickest way to get started using the `sir` example project is to copy
it into a separate directory (outside of the `SDEverywhere` working copy).
This will allow you to install the `@sdeverywhere/*` packages using your
package manager of choice (npm, yarn, or pnpm).

```sh
# Change to the parent of your SDEverywhere working copy
cd <parentdir>

# Copy the example to a separate directory
cp -rf SDEverywhere/examples/sir .

# Change to the copied directory
cd ./sir

# Create a new project (you can also use yarn or pnpm here, if preferred).
# Be sure to choose the "Default" template, which will make use of the
# existing files in the `sir/config` directory that have been
# pre-configured with some graphs and sliders.
npm create @sdeverywhere@latest

# Enter development mode for the sample model.  This will start a live
# development environment that will build a JavaScript version of the
# sample model and run checks on it any time you make changes to:
#   - the config files
#   - the Vensim model file (model/sir.mdl)
#   - the model check definitions (model/checks/*.yaml)
#   - the model comparison definitions (model/comparisons/*.yaml)
npm run dev
```

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
