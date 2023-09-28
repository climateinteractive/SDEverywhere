# Changelog


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/runtime bumped from ^0.2.0 to ^0.2.1
    * @sdeverywhere/runtime-async bumped from ^0.2.0 to ^0.2.1
  * devDependencies
    * @sdeverywhere/build bumped from * to 0.3.2

## [0.2.1](https://github.com/climateinteractive/SDEverywhere/compare/plugin-worker-v0.2.0...plugin-worker-v0.2.1) (2023-09-05)


### Bug Fixes

* upgrade to vite 4.4.9 ([#354](https://github.com/climateinteractive/SDEverywhere/issues/354)) ([db975fa](https://github.com/climateinteractive/SDEverywhere/commit/db975fa47705e22005d0c04500567d3480502f52)), closes [#351](https://github.com/climateinteractive/SDEverywhere/issues/351)

## [0.2.0](https://github.com/climateinteractive/SDEverywhere/compare/plugin-worker-v0.1.4...plugin-worker-v0.2.0) (2022-12-10)


### ⚠ BREAKING CHANGES

* The `startTime` and `endTime` properties have been removed from the `ModelSpec` interface in the `@sdeverywhere/build` package, so it is no longer necessary for you to provide them in your `sde.config.js` file.

### Bug Fixes

* remove `startTime` and `endTime` from `ModelSpec` interface and handle SAVEPER != 1 ([921014a](https://github.com/climateinteractive/SDEverywhere/commit/921014aeeda646a130ac324823ab5633d6abcdfa))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/runtime bumped from ^0.1.0 to ^0.2.0
    * @sdeverywhere/runtime-async bumped from ^0.1.0 to ^0.2.0
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.2.0 to ^0.3.0

## [0.1.4](https://github.com/climateinteractive/SDEverywhere/compare/plugin-worker-v0.1.3...plugin-worker-v0.1.4) (2022-09-28)


### Bug Fixes

* make build package a peer dependency for plugins ([#241](https://github.com/climateinteractive/SDEverywhere/issues/241)) ([05ea85f](https://github.com/climateinteractive/SDEverywhere/commit/05ea85f256ceed064018cdfab1bd6d52a7dca735)), closes [#237](https://github.com/climateinteractive/SDEverywhere/issues/237)
* upgrade to vite 3.1.3 ([#242](https://github.com/climateinteractive/SDEverywhere/issues/242)) ([e6ff922](https://github.com/climateinteractive/SDEverywhere/commit/e6ff922f002411b83a9ab0688c5a65433b8f4d61)), closes [#238](https://github.com/climateinteractive/SDEverywhere/issues/238)

## [0.1.3](https://github.com/climateinteractive/SDEverywhere/compare/plugin-worker-v0.1.2...plugin-worker-v0.1.3) (2022-09-26)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/build bumped from ^0.1.1 to ^0.2.0


## [0.1.2](https://github.com/climateinteractive/SDEverywhere/compare/plugin-worker-v0.1.1...plugin-worker-v0.1.2) (2022-08-05)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/build bumped from ^0.1.0 to ^0.1.1

## [0.1.1](https://github.com/climateinteractive/SDEverywhere/compare/plugin-worker-v0.1.0...plugin-worker-v0.1.1) (2022-07-12)


### Bug Fixes

* add rollup as dependency to avoid issues with transitive peerDependencies ([#214](https://github.com/climateinteractive/SDEverywhere/issues/214)) ([4ca5052](https://github.com/climateinteractive/SDEverywhere/commit/4ca50521ddac2f6d9434b20cd272684bf26d95e2)), closes [#209](https://github.com/climateinteractive/SDEverywhere/issues/209)

## 0.1.0 (2022-06-28)


### Features

* add build and plugin-{check,vite,wasm,worker} packages ([#206](https://github.com/climateinteractive/SDEverywhere/issues/206)) ([dd34cbf](https://github.com/climateinteractive/SDEverywhere/commit/dd34cbfcc0b8b3fb1655c8aa64fb919f9757b8be)), closes [#203](https://github.com/climateinteractive/SDEverywhere/issues/203)
