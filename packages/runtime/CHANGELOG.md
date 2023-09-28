# Changelog

## [0.2.1](https://github.com/climateinteractive/SDEverywhere/compare/runtime-v0.2.0...runtime-v0.2.1) (2023-09-28)


### Features

* add support for capturing data for any variable at runtime ([#355](https://github.com/climateinteractive/SDEverywhere/issues/355)) ([5d12836](https://github.com/climateinteractive/SDEverywhere/commit/5d1283657ba99f6c7f8e30f8053f1906ac872af3)), closes [#105](https://github.com/climateinteractive/SDEverywhere/issues/105)

## [0.2.0](https://github.com/climateinteractive/SDEverywhere/compare/runtime-v0.1.0...runtime-v0.2.0) (2022-12-10)


### ⚠ BREAKING CHANGES

* The `startTime` and `endTime` properties have been removed from the `ModelSpec` interface in the `@sdeverywhere/build` package, so it is no longer necessary for you to provide them in your `sde.config.js` file.
* The `timeStart` and `timeEnd` properties in the `Outputs` class in the `@sdeverywhere/runtime` package have been renamed to `startTime` and `endTime`, and there is an additional `saveFreq` argument for the `Outputs` constructor (which defaults to 1).

### Bug Fixes

* change Series.getValueAtTime to work with non-1 save frequency ([ba510b0](https://github.com/climateinteractive/SDEverywhere/commit/ba510b0d297f36563b3d08bb71b5f2707e09bdf1))
* remove `startTime` and `endTime` from `ModelSpec` interface and handle SAVEPER != 1 ([921014a](https://github.com/climateinteractive/SDEverywhere/commit/921014aeeda646a130ac324823ab5633d6abcdfa))

## 0.1.0 (2022-06-28)


### Features

* add build and plugin-{check,vite,wasm,worker} packages ([#206](https://github.com/climateinteractive/SDEverywhere/issues/206)) ([dd34cbf](https://github.com/climateinteractive/SDEverywhere/commit/dd34cbfcc0b8b3fb1655c8aa64fb919f9757b8be)), closes [#203](https://github.com/climateinteractive/SDEverywhere/issues/203)
* add runtime and runtime-async packages ([#200](https://github.com/climateinteractive/SDEverywhere/issues/200)) ([fd52822](https://github.com/climateinteractive/SDEverywhere/commit/fd52822803981c3115af91fd093b30c04f103663)), closes [#198](https://github.com/climateinteractive/SDEverywhere/issues/198)
