# @sdeverywhere/build

This package provides the core build and plugin API for [SDEverywhere](https://github.com/climateinteractive/SDEverywhere).

## Quick Start

The best way to get started with SDEverywhere is to follow the [Quick Start](https://github.com/climateinteractive/SDEverywhere#quick-start) instructions.
If you follow those instructions, the `@sdeverywhere/build` package will be added to your project automatically, in which case you can skip the following section.

## Install

```sh
# npm
npm install --save-dev @sdeverywhere/build

# pnpm
pnpm add -D @sdeverywhere/build

# yarn
yarn add -D @sdeverywhere/build
```

## Usage

Most users do not need to interact with the `@sdeverywhere/build` package directly; it is primarily used in the implementation of the `sde` command line tool (from the `@sdeverywhere/cli` package).

However, if you are building a custom plugin or a tool that drives the build process programmatically, you can refer to the API documentation below for more details.

## Documentation

API documentation is available in the [`docs`](./docs/index.md) directory.

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
