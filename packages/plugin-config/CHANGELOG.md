# Changelog

## [0.2.5](https://github.com/climateinteractive/SDEverywhere/compare/plugin-config-v0.2.4...plugin-config-v0.2.5) (2024-08-17)


### Features

* add bundleListing, customLookups, and customOutputs settings to control code generation ([#504](https://github.com/climateinteractive/SDEverywhere/issues/504)) ([fcea642](https://github.com/climateinteractive/SDEverywhere/commit/fcea642a8e0bcd23e3ebf07983f1f30415b4f81d)), closes [#503](https://github.com/climateinteractive/SDEverywhere/issues/503)


### Bug Fixes

* update build and plugin packages to support JS code generation ([#487](https://github.com/climateinteractive/SDEverywhere/issues/487)) ([18b0873](https://github.com/climateinteractive/SDEverywhere/commit/18b0873e74facea772e56f59a1ba4470ebb1fdd6)), closes [#479](https://github.com/climateinteractive/SDEverywhere/issues/479)


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.3.1 to ^0.3.5

## [0.2.4](https://github.com/climateinteractive/SDEverywhere/compare/plugin-config-v0.2.3...plugin-config-v0.2.4) (2023-11-14)


### Bug Fixes

* add a spec field to ConfigProcessorOptions to allow for providing additional spec.json values ([#391](https://github.com/climateinteractive/SDEverywhere/issues/391)) ([82f2d93](https://github.com/climateinteractive/SDEverywhere/commit/82f2d93864d96a455bea7c003604f29ebdadbfb0)), closes [#390](https://github.com/climateinteractive/SDEverywhere/issues/390)

## [0.2.3](https://github.com/climateinteractive/SDEverywhere/compare/plugin-config-v0.2.2...plugin-config-v0.2.3) (2023-09-29)

Note: This is a redo of the 0.2.2 release to workaround an npmjs registry issue.  There are no actual changes in this release.


## [0.2.2](https://github.com/climateinteractive/SDEverywhere/compare/plugin-config-v0.2.1...plugin-config-v0.2.2) (2023-09-28)


### Bug Fixes

* add trivial changes to correct previous publish failures and force re-publish ([#362](https://github.com/climateinteractive/SDEverywhere/issues/362)) ([544d4da](https://github.com/climateinteractive/SDEverywhere/commit/544d4dac5f5d6d71885f9ba15f95ee9c91e0ec66)), closes [#361](https://github.com/climateinteractive/SDEverywhere/issues/361)

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
