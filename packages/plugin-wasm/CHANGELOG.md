# Changelog

## [0.2.7](https://github.com/climateinteractive/SDEverywhere/compare/plugin-wasm-v0.2.6...plugin-wasm-v0.2.7) (2026-02-04)


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.3.7 to ^0.3.10

## [0.2.6](https://github.com/climateinteractive/SDEverywhere/compare/plugin-wasm-v0.2.5...plugin-wasm-v0.2.6) (2024-12-13)


### Bug Fixes

* remove duplicate implementations of canonical[Var]Name functions ([#580](https://github.com/climateinteractive/SDEverywhere/issues/580)) ([e215d7d](https://github.com/climateinteractive/SDEverywhere/commit/e215d7de5e2fe551a0dd4cb6e3a960180db4b76f)), closes [#578](https://github.com/climateinteractive/SDEverywhere/issues/578)


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.3.6 to ^0.3.7

## [0.2.5](https://github.com/climateinteractive/SDEverywhere/compare/plugin-wasm-v0.2.4...plugin-wasm-v0.2.5) (2024-08-23)


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.3.5 to ^0.3.6

## [0.2.4](https://github.com/climateinteractive/SDEverywhere/compare/plugin-wasm-v0.2.3...plugin-wasm-v0.2.4) (2024-08-17)


### Features

* add bundleListing, customLookups, and customOutputs settings to control code generation ([#504](https://github.com/climateinteractive/SDEverywhere/issues/504)) ([fcea642](https://github.com/climateinteractive/SDEverywhere/commit/fcea642a8e0bcd23e3ebf07983f1f30415b4f81d)), closes [#503](https://github.com/climateinteractive/SDEverywhere/issues/503)
* add compiler and runtime support for generating pure JS models ([#486](https://github.com/climateinteractive/SDEverywhere/issues/486)) ([42d4dc6](https://github.com/climateinteractive/SDEverywhere/commit/42d4dc6da2fba3b34474c634374e07bc56d72868)), closes [#437](https://github.com/climateinteractive/SDEverywhere/issues/437)
* allow for creating a LookupDef without manually initializing a ModelListing ([#502](https://github.com/climateinteractive/SDEverywhere/issues/502)) ([5690055](https://github.com/climateinteractive/SDEverywhere/commit/569005502d2240a22b6a31284215b89ec1f8de05)), closes [#501](https://github.com/climateinteractive/SDEverywhere/issues/501)
* allow for overriding data variables and lookups at runtime ([#490](https://github.com/climateinteractive/SDEverywhere/issues/490)) ([6c888e8](https://github.com/climateinteractive/SDEverywhere/commit/6c888e887336e7b874dbde7e318e993936296c48)), closes [#472](https://github.com/climateinteractive/SDEverywhere/issues/472)
* change ModelSpec to allow for simple array of input/output var names ([#495](https://github.com/climateinteractive/SDEverywhere/issues/495)) ([3130901](https://github.com/climateinteractive/SDEverywhere/commit/31309017e207ac6ce0d0bcd20499b12b5b918bb9)), closes [#494](https://github.com/climateinteractive/SDEverywhere/issues/494)


### Bug Fixes

* change plugin-wasm to expose outputVarIds in the generated module ([#482](https://github.com/climateinteractive/SDEverywhere/issues/482)) ([9c2f7d1](https://github.com/climateinteractive/SDEverywhere/commit/9c2f7d1ae953f7de3a55dc3ef7a7f35a3422069e)), closes [#481](https://github.com/climateinteractive/SDEverywhere/issues/481)
* update build and plugin packages to support JS code generation ([#487](https://github.com/climateinteractive/SDEverywhere/issues/487)) ([18b0873](https://github.com/climateinteractive/SDEverywhere/commit/18b0873e74facea772e56f59a1ba4470ebb1fdd6)), closes [#479](https://github.com/climateinteractive/SDEverywhere/issues/479)
* update plugin-wasm to export `_free` function ([#475](https://github.com/climateinteractive/SDEverywhere/issues/475)) ([1a77eed](https://github.com/climateinteractive/SDEverywhere/commit/1a77eedd3143568ad3b4659f6b78dd9b60737b53)), closes [#474](https://github.com/climateinteractive/SDEverywhere/issues/474)


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.3.0 to ^0.3.5

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
