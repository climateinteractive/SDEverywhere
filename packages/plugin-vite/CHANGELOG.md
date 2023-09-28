# Changelog

## [0.1.6](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.5...plugin-vite-v0.1.6) (2023-09-05)

Note: The `peerDependencies` field for the `plugin-vite` package has been updated to allow for either `vite ^3.0.0` or `vite ^4.0.0`.
While other SDEverywhere packages have been updated to use Vite 4 internally, the `plugin-vite` package should work fine regardless
of whether your project is configured to use Vite 3 or Vite 4.

### Bug Fixes

* upgrade to vite 4.4.9 ([#354](https://github.com/climateinteractive/SDEverywhere/issues/354)) ([db975fa](https://github.com/climateinteractive/SDEverywhere/commit/db975fa47705e22005d0c04500567d3480502f52)), closes [#351](https://github.com/climateinteractive/SDEverywhere/issues/351)

## [0.1.5](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.4...plugin-vite-v0.1.5) (2022-12-10)

### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.2.0 to ^0.3.0

## [0.1.4](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.3...plugin-vite-v0.1.4) (2022-10-25)

### Bug Fixes

* make vite a peer dependency for plugin-vite ([#269](https://github.com/climateinteractive/SDEverywhere/issues/269)) ([eaa02fc](https://github.com/climateinteractive/SDEverywhere/commit/eaa02fcb160735ea591f6074cecb662d1b24289c)), closes [#268](https://github.com/climateinteractive/SDEverywhere/issues/268)

## [0.1.3](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.2...plugin-vite-v0.1.3) (2022-09-28)


### Bug Fixes

* make build package a peer dependency for plugins ([#241](https://github.com/climateinteractive/SDEverywhere/issues/241)) ([05ea85f](https://github.com/climateinteractive/SDEverywhere/commit/05ea85f256ceed064018cdfab1bd6d52a7dca735)), closes [#237](https://github.com/climateinteractive/SDEverywhere/issues/237)
* upgrade to vite 3.1.3 ([#242](https://github.com/climateinteractive/SDEverywhere/issues/242)) ([e6ff922](https://github.com/climateinteractive/SDEverywhere/commit/e6ff922f002411b83a9ab0688c5a65433b8f4d61)), closes [#238](https://github.com/climateinteractive/SDEverywhere/issues/238)


## [0.1.2](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.1...plugin-vite-v0.1.2) (2022-09-21)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/build bumped from ^0.1.1 to ^0.2.0


## [0.1.1](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.0...plugin-vite-v0.1.1) (2022-08-05)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/build bumped from ^0.1.0 to ^0.1.1

## 0.1.0 (2022-06-28)


### Features

* add build and plugin-{check,vite,wasm,worker} packages ([#206](https://github.com/climateinteractive/SDEverywhere/issues/206)) ([dd34cbf](https://github.com/climateinteractive/SDEverywhere/commit/dd34cbfcc0b8b3fb1655c8aa64fb919f9757b8be)), closes [#203](https://github.com/climateinteractive/SDEverywhere/issues/203)
