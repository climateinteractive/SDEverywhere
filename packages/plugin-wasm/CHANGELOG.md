# Changelog

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
