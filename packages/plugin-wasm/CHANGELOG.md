# Changelog

## [0.2.3](https://github.com/climateinteractive/SDEverywhere/compare/plugin-wasm-v0.2.2...plugin-wasm-v0.2.3) (2024-02-23)


### Bug Fixes

* improve error handling/reporting and prevent premature exit in dev mode ([#434](https://github.com/climateinteractive/SDEverywhere/issues/434)) ([98ab523](https://github.com/climateinteractive/SDEverywhere/commit/98ab523907aa8ebe4dfe22eac0179ffb5364cd2a)), closes [#260](https://github.com/climateinteractive/SDEverywhere/issues/260)


## [0.2.2](https://github.com/climateinteractive/SDEverywhere/compare/plugin-wasm-v0.2.1...plugin-wasm-v0.2.2) (2023-10-02)


### Features

* allow for customizing emcc arguments in plugin-wasm ([#372](https://github.com/climateinteractive/SDEverywhere/issues/372)) ([e71992b](https://github.com/climateinteractive/SDEverywhere/commit/e71992b874539c5ecf1785a2d779fdeafa1a4fde)), closes [#371](https://github.com/climateinteractive/SDEverywhere/issues/371)

## [0.2.1](https://github.com/climateinteractive/SDEverywhere/compare/plugin-wasm-v0.2.0...plugin-wasm-v0.2.1) (2023-09-28)


### Features

* add support for capturing data for any variable at runtime ([#355](https://github.com/climateinteractive/SDEverywhere/issues/355)) ([5d12836](https://github.com/climateinteractive/SDEverywhere/commit/5d1283657ba99f6c7f8e30f8053f1906ac872af3)), closes [#105](https://github.com/climateinteractive/SDEverywhere/issues/105)


## [0.2.0](https://github.com/climateinteractive/SDEverywhere/compare/plugin-wasm-v0.1.3...plugin-wasm-v0.2.0) (2022-12-10)


### ⚠ BREAKING CHANGES

* The `startTime` and `endTime` properties have been removed from the `ModelSpec` interface in the `@sdeverywhere/build` package, so it is no longer necessary for you to provide them in your `sde.config.js` file.

### Bug Fixes

* remove `startTime` and `endTime` from `ModelSpec` interface and handle SAVEPER != 1 ([921014a](https://github.com/climateinteractive/SDEverywhere/commit/921014aeeda646a130ac324823ab5633d6abcdfa))


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.2.0 to ^0.3.0

## [0.1.3](https://github.com/climateinteractive/SDEverywhere/compare/plugin-wasm-v0.1.2...plugin-wasm-v0.1.3) (2022-09-28)


### Bug Fixes

* make build package a peer dependency for plugins ([#241](https://github.com/climateinteractive/SDEverywhere/issues/241)) ([05ea85f](https://github.com/climateinteractive/SDEverywhere/commit/05ea85f256ceed064018cdfab1bd6d52a7dca735)), closes [#237](https://github.com/climateinteractive/SDEverywhere/issues/237)


## [0.1.2](https://github.com/climateinteractive/SDEverywhere/compare/plugin-wasm-v0.1.1...plugin-wasm-v0.1.2) (2022-09-21)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/build bumped from ^0.1.1 to ^0.2.0


## [0.1.1](https://github.com/climateinteractive/SDEverywhere/compare/plugin-wasm-v0.1.0...plugin-wasm-v0.1.1) (2022-08-05)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/build bumped from ^0.1.0 to ^0.1.1

## 0.1.0 (2022-06-28)


### Features

* add build and plugin-{check,vite,wasm,worker} packages ([#206](https://github.com/climateinteractive/SDEverywhere/issues/206)) ([dd34cbf](https://github.com/climateinteractive/SDEverywhere/commit/dd34cbfcc0b8b3fb1655c8aa64fb919f9757b8be)), closes [#203](https://github.com/climateinteractive/SDEverywhere/issues/203)
