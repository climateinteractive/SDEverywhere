# Changelog

### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @sdeverywhere/build bumped from * to 0.3.2

## [0.2.1](https://github.com/climateinteractive/SDEverywhere/compare/plugin-config-v0.2.0...plugin-config-v0.2.1) (2023-05-03)


### Bug Fixes

* add inputId property to InputSpec interface ([#321](https://github.com/climateinteractive/SDEverywhere/issues/321)) ([f461433](https://github.com/climateinteractive/SDEverywhere/commit/f461433df9ae013e73a76a1103c9cb8a5d22ab52)), closes [#320](https://github.com/climateinteractive/SDEverywhere/issues/320)


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.3.0 to ^0.3.1

## [0.2.0](https://github.com/climateinteractive/SDEverywhere/compare/plugin-config-v0.1.1...plugin-config-v0.2.0) (2022-12-10)


### ⚠ BREAKING CHANGES

* The `startTime` and `endTime` properties have been removed from the `ModelSpec` interface in the `@sdeverywhere/build` package, so it is no longer necessary for you to provide them in your `sde.config.js` file.

### Bug Fixes

* remove `startTime` and `endTime` from `ModelSpec` interface and handle SAVEPER != 1 ([921014a](https://github.com/climateinteractive/SDEverywhere/commit/921014aeeda646a130ac324823ab5633d6abcdfa))
* upgrade csv-parse to 5.3.3 and update option names ([#300](https://github.com/climateinteractive/SDEverywhere/issues/300)) ([71d0c8b](https://github.com/climateinteractive/SDEverywhere/commit/71d0c8b2d0e5f4737f968975a16bfd7b2d47b87a)), closes [#299](https://github.com/climateinteractive/SDEverywhere/issues/299)


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.2.0 to ^0.3.0

## [0.1.1](https://github.com/climateinteractive/SDEverywhere/compare/plugin-config-v0.1.0...plugin-config-v0.1.1) (2022-09-28)


### Bug Fixes

* make build package a peer dependency for plugins ([#241](https://github.com/climateinteractive/SDEverywhere/issues/241)) ([05ea85f](https://github.com/climateinteractive/SDEverywhere/commit/05ea85f256ceed064018cdfab1bd6d52a7dca735)), closes [#237](https://github.com/climateinteractive/SDEverywhere/issues/237)

## 0.1.0 (2022-09-22)


### Features

* add plugin-config package ([#234](https://github.com/climateinteractive/SDEverywhere/issues/234)) ([cfc7be0](https://github.com/climateinteractive/SDEverywhere/commit/cfc7be0f78a88ab1e3f601cba93e8f882e9d072d)), closes [#229](https://github.com/climateinteractive/SDEverywhere/issues/229)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/build bumped from ^0.1.1 to ^0.2.0
