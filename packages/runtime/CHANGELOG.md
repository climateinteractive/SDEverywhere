# Changelog

## [0.2.3](https://github.com/climateinteractive/SDEverywhere/compare/runtime-v0.2.2...runtime-v0.2.3) (2024-08-17)


### Features

* add compiler and runtime support for generating pure JS models ([#486](https://github.com/climateinteractive/SDEverywhere/issues/486)) ([42d4dc6](https://github.com/climateinteractive/SDEverywhere/commit/42d4dc6da2fba3b34474c634374e07bc56d72868)), closes [#437](https://github.com/climateinteractive/SDEverywhere/issues/437)
* add support for GAME function and for providing gaming inputs at runtime ([#505](https://github.com/climateinteractive/SDEverywhere/issues/505)) ([338e91e](https://github.com/climateinteractive/SDEverywhere/commit/338e91edff16ce47109ef50cdbddef9ae7a27fa2)), closes [#483](https://github.com/climateinteractive/SDEverywhere/issues/483)
* allow for creating a LookupDef without manually initializing a ModelListing ([#502](https://github.com/climateinteractive/SDEverywhere/issues/502)) ([5690055](https://github.com/climateinteractive/SDEverywhere/commit/569005502d2240a22b6a31284215b89ec1f8de05)), closes [#501](https://github.com/climateinteractive/SDEverywhere/issues/501)
* allow for overriding data variables and lookups at runtime ([#490](https://github.com/climateinteractive/SDEverywhere/issues/490)) ([6c888e8](https://github.com/climateinteractive/SDEverywhere/commit/6c888e887336e7b874dbde7e318e993936296c48)), closes [#472](https://github.com/climateinteractive/SDEverywhere/issues/472)


### Bug Fixes

* allow runModel to proceed without error when inputs array is empty ([#499](https://github.com/climateinteractive/SDEverywhere/issues/499)) ([3996237](https://github.com/climateinteractive/SDEverywhere/commit/39962371f5c4caec035570f90f64616b83b65aee)), closes [#498](https://github.com/climateinteractive/SDEverywhere/issues/498)
* change encoding of variable and lookup indices to allow for arbitrary number of subscripts ([#507](https://github.com/climateinteractive/SDEverywhere/issues/507)) ([697e943](https://github.com/climateinteractive/SDEverywhere/commit/697e94397ca00b33d2e6216d63f4cfbc2f160fa0)), closes [#506](https://github.com/climateinteractive/SDEverywhere/issues/506)
* refactor runtime and runtime-async packages to allocate/grow buffers on demand ([#484](https://github.com/climateinteractive/SDEverywhere/issues/484)) ([5e1c686](https://github.com/climateinteractive/SDEverywhere/commit/5e1c686c7f93fe96ff784dfe591fe391b2a31e8f)), closes [#471](https://github.com/climateinteractive/SDEverywhere/issues/471)
* update build and plugin packages to support JS code generation ([#487](https://github.com/climateinteractive/SDEverywhere/issues/487)) ([18b0873](https://github.com/climateinteractive/SDEverywhere/commit/18b0873e74facea772e56f59a1ba4470ebb1fdd6)), closes [#479](https://github.com/climateinteractive/SDEverywhere/issues/479)
* update plugin-wasm to export `_free` function ([#475](https://github.com/climateinteractive/SDEverywhere/issues/475)) ([1a77eed](https://github.com/climateinteractive/SDEverywhere/commit/1a77eedd3143568ad3b4659f6b78dd9b60737b53)), closes [#474](https://github.com/climateinteractive/SDEverywhere/issues/474)

## [0.2.2](https://github.com/climateinteractive/SDEverywhere/compare/runtime-v0.2.1...runtime-v0.2.2) (2023-09-28)


### Bug Fixes

* add trivial changes to correct previous publish failures and force re-publish ([#362](https://github.com/climateinteractive/SDEverywhere/issues/362)) ([544d4da](https://github.com/climateinteractive/SDEverywhere/commit/544d4dac5f5d6d71885f9ba15f95ee9c91e0ec66)), closes [#361](https://github.com/climateinteractive/SDEverywhere/issues/361)

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
