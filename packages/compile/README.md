# @sdeverywhere/compile

This package contains the core [SDEverywhere](https://github.com/climateinteractive/SDEverywhere) compiler that takes a Vensim or Stella model as input and generates C or JavaScript code as output.

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
As such, there is no public API documentation at this time, but we hope to expose a public API once the interfaces stabilize.

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
