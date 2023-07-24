# @sdeverywhere/check-core

This package provides the core implementation of the System Dynamics model checking and comparison functionality in [SDEverywhere](https://github.com/climateinteractive/SDEverywhere).

## Quick Start

The best way to get started with SDEverywhere is to follow the [Quick Start](https://github.com/climateinteractive/SDEverywhere#quick-start) instructions.
If you follow those instructions, the `@sdeverywhere/plugin-check` package will be added to your project, and that package uses `@sdeverywhere/check-core` as an implementation detail.
Therefore, most users do not need to install this package directly.

## Install

As noted above, most users do not need to install this package directly, but for more advanced use cases, it can be installed as follows.

```sh
# npm
npm install @sdeverywhere/check-core

# pnpm
pnpm add @sdeverywhere/check-core

# yarn
yarn add @sdeverywhere/check-core
```

## Usage

Most users do not need to interact with the `@sdeverywhere/check-core` package directly; it is primarily used in the implementation of `@sdeverywhere/plugin-check` and the related UI package, `@sdeverywhere/check-ui-shell`.

However, if you would like to build a custom tool for running checks and comparison tests on models, you can refer to the API documentation below for more details.

## Documentation

API documentation is available in the [`docs`](./docs/index.md) directory.

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
