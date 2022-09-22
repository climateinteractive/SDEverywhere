# template-minimal

This is a template that is used by the `@sdeverywhere/create` package to generate a
new project that uses SDEverywhere.

The generated project is more minimal than the "default" template, but may be
useful if you don't want to generate a library or app around your model and
if you are more interested in just running the "model-check" tool.

Note that unlike the "default" template, this template does not use config files
(e.g., CSV files read from the `config` directory), so you can edit the
`sde.config.js` file to configure the input and output variables.

(If you decide later to use config files, refer to `template-default` to see how
to add the `@sdeverywhere/plugin-config` package to your project.)

## Quick Start

```sh
# Create a new project (you can also use yarn or pnpm here, if preferred).
# Be sure to choose the "Minimal" template.
npm create @sdeverywhere

# Enter development mode for your model.  This will start a live
# development environment that will build a WebAssembly version of the
# model and run checks on it any time you make changes to:
#   - the Vensim model file (<name>.mdl)
#   - the checks file (<name>.check.yaml)
npm run dev
```

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
