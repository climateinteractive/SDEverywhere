# Changelog

## [0.2.2](https://github.com/climateinteractive/SDEverywhere/compare/create-v0.2.1...create-v0.2.2) (2023-04-04)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/compile bumped from ^0.7.4 to ^0.7.5

## [0.2.1](https://github.com/climateinteractive/SDEverywhere/compare/create-v0.2.0...create-v0.2.1) (2022-12-13)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/compile bumped from ^0.7.3 to ^0.7.4

## [0.2.0](https://github.com/climateinteractive/SDEverywhere/compare/create-v0.1.3...create-v0.2.0) (2022-12-10)


### ⚠ BREAKING CHANGES

* The `startTime` and `endTime` properties have been removed from the `ModelSpec` interface in the `@sdeverywhere/build` package, so it is no longer necessary for you to provide them in your `sde.config.js` file.

### Bug Fixes

* remove `startTime` and `endTime` from `ModelSpec` interface and handle SAVEPER != 1 ([921014a](https://github.com/climateinteractive/SDEverywhere/commit/921014aeeda646a130ac324823ab5633d6abcdfa))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/compile bumped from ^0.7.2 to ^0.7.3

## [0.1.3](https://github.com/climateinteractive/SDEverywhere/compare/create-v0.1.2...create-v0.1.3) (2022-12-09)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/compile bumped from ^0.7.1 to ^0.7.2

## [0.1.2](https://github.com/climateinteractive/SDEverywhere/compare/create-v0.1.1...create-v0.1.2) (2022-10-24)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/compile bumped from ^0.7.0 to ^0.7.1

## [0.1.1](https://github.com/climateinteractive/SDEverywhere/compare/create-v0.1.0...create-v0.1.1) (2022-09-28)


### Bug Fixes

* only report error for install deps step if exit code is non-zero ([#249](https://github.com/climateinteractive/SDEverywhere/issues/249)) ([dc14b1c](https://github.com/climateinteractive/SDEverywhere/commit/dc14b1cbcc5119e08c4878ecdc5d133e74acacfa)), closes [#239](https://github.com/climateinteractive/SDEverywhere/issues/239)

## 0.1.0 (2022-09-22)


### Features

* add `create` package for simpler project init ([#235](https://github.com/climateinteractive/SDEverywhere/issues/235)) ([daaa0b0](https://github.com/climateinteractive/SDEverywhere/commit/daaa0b0ae670b51ea92ef0ec4893d11dfa05d3f1)), closes [#228](https://github.com/climateinteractive/SDEverywhere/issues/228)

## Changelog
