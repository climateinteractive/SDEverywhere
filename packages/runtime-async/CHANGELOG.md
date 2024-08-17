# Changelog

## [0.2.3](https://github.com/climateinteractive/SDEverywhere/compare/runtime-async-v0.2.2...runtime-async-v0.2.3) (2024-08-17)


### Features

* add compiler and runtime support for generating pure JS models ([#486](https://github.com/climateinteractive/SDEverywhere/issues/486)) ([42d4dc6](https://github.com/climateinteractive/SDEverywhere/commit/42d4dc6da2fba3b34474c634374e07bc56d72868)), closes [#437](https://github.com/climateinteractive/SDEverywhere/issues/437)
* allow for creating a LookupDef without manually initializing a ModelListing ([#502](https://github.com/climateinteractive/SDEverywhere/issues/502)) ([5690055](https://github.com/climateinteractive/SDEverywhere/commit/569005502d2240a22b6a31284215b89ec1f8de05)), closes [#501](https://github.com/climateinteractive/SDEverywhere/issues/501)
* allow for overriding data variables and lookups at runtime ([#490](https://github.com/climateinteractive/SDEverywhere/issues/490)) ([6c888e8](https://github.com/climateinteractive/SDEverywhere/commit/6c888e887336e7b874dbde7e318e993936296c48)), closes [#472](https://github.com/climateinteractive/SDEverywhere/issues/472)


### Bug Fixes

* allow runModel to proceed without error when inputs array is empty ([#499](https://github.com/climateinteractive/SDEverywhere/issues/499)) ([3996237](https://github.com/climateinteractive/SDEverywhere/commit/39962371f5c4caec035570f90f64616b83b65aee)), closes [#498](https://github.com/climateinteractive/SDEverywhere/issues/498)
* refactor runtime and runtime-async packages to allocate/grow buffers on demand ([#484](https://github.com/climateinteractive/SDEverywhere/issues/484)) ([5e1c686](https://github.com/climateinteractive/SDEverywhere/commit/5e1c686c7f93fe96ff784dfe591fe391b2a31e8f)), closes [#471](https://github.com/climateinteractive/SDEverywhere/issues/471)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/runtime bumped from ^0.2.2 to ^0.2.3

## [0.2.2](https://github.com/climateinteractive/SDEverywhere/compare/runtime-async-v0.2.1...runtime-async-v0.2.2) (2023-09-28)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/runtime bumped from ^0.2.1 to ^0.2.2

## [0.2.1](https://github.com/climateinteractive/SDEverywhere/compare/runtime-async-v0.2.0...runtime-async-v0.2.1) (2023-09-28)


### Features

* add support for capturing data for any variable at runtime ([#355](https://github.com/climateinteractive/SDEverywhere/issues/355)) ([5d12836](https://github.com/climateinteractive/SDEverywhere/commit/5d1283657ba99f6c7f8e30f8053f1906ac872af3)), closes [#105](https://github.com/climateinteractive/SDEverywhere/issues/105)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/runtime bumped from ^0.2.0 to ^0.2.1

## [0.2.0](https://github.com/climateinteractive/SDEverywhere/compare/runtime-async-v0.1.0...runtime-async-v0.2.0) (2022-12-10)


### ⚠ BREAKING CHANGES

* The `startTime` and `endTime` properties have been removed from the `ModelSpec` interface in the `@sdeverywhere/build` package, so it is no longer necessary for you to provide them in your `sde.config.js` file.

### Bug Fixes

* remove `startTime` and `endTime` from `ModelSpec` interface and handle SAVEPER != 1 ([921014a](https://github.com/climateinteractive/SDEverywhere/commit/921014aeeda646a130ac324823ab5633d6abcdfa))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/runtime bumped from ^0.1.0 to ^0.2.0

## 0.1.0 (2022-06-28)


### Features

* add build and plugin-{check,vite,wasm,worker} packages ([#206](https://github.com/climateinteractive/SDEverywhere/issues/206)) ([dd34cbf](https://github.com/climateinteractive/SDEverywhere/commit/dd34cbfcc0b8b3fb1655c8aa64fb919f9757b8be)), closes [#203](https://github.com/climateinteractive/SDEverywhere/issues/203)
* add runtime and runtime-async packages ([#200](https://github.com/climateinteractive/SDEverywhere/issues/200)) ([fd52822](https://github.com/climateinteractive/SDEverywhere/commit/fd52822803981c3115af91fd093b30c04f103663)), closes [#198](https://github.com/climateinteractive/SDEverywhere/issues/198)
