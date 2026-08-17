# @sdeverywhere/compile

This package contains the core [SDEverywhere](https://github.com/climateinteractive/SDEverywhere) compiler that takes a Vensim or Stella model as input and generates JavaScript or C code as output.

## Quick Start

The best way to get started with SDEverywhere is to follow the [Quick Start](https://github.com/climateinteractive/SDEverywhere#quick-start) instructions.
If you follow those instructions, the `@sdeverywhere/cli` package will be added to your project automatically, and that package uses `@sdeverywhere/compile` as an implementation detail.
Therefore, most users do not need to install this package directly.

## Install

As noted above, most users do not need to install this package directly, but for more advanced use cases, it can be installed as follows.

```sh
# npm
npm install --save-dev @sdeverywhere/compile

# pnpm
pnpm add -D @sdeverywhere/compile

# yarn
yarn add -D @sdeverywhere/compile
```

## Usage

Most users do not need to interact with the `@sdeverywhere/compile` package directly; it is primarily used in the implementation of the `@sdeverywhere/cli` package and `sde` command line tool.

More usage details will be included here at a later time when the interfaces stabilize.

## Documentation

The `compile` package is currently treated as an implementation detail of the `cli` package.
As such, there is no generated API documentation at this time, but we hope to expose a public API once the interfaces stabilize.

In the meantime, the types for the public API are declared using JSDoc comments alongside the code that defines them, and the `build` script generates the corresponding `.d.ts` files (under `dist`) that are published with the package.
Of particular note, the [`ModelSpec`](./src/_shared/model-spec.js) type is the authoritative definition of the JSON "spec file" format that is passed to the `sde generate` command using the `--spec` argument, and every supported property is documented there.
For a summary of those properties in prose form, see the ["Configuration files"](../cli/README.md#configuration-files) section of the `cli` package README.

Note that the `ModelSpec` type in the [`@sdeverywhere/build`](../build/README.md) package (which describes the `modelSpec` section of an `sde.config.js` file) is derived from the `ModelSpec` type in this package, so the two formats share a single definition for the properties they have in common.

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
