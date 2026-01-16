# Changelog

## [0.3.9](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.3.8...build-v0.3.9) (2026-01-10)


### Bug Fixes

* improve handling of glob patterns for build `watchPaths` ([#761](https://github.com/climateinteractive/SDEverywhere/issues/761)) ([9e73220](https://github.com/climateinteractive/SDEverywhere/commit/9e73220548a7f5eb1a80c4ddfbf8afa8545781bb)), closes [#760](https://github.com/climateinteractive/SDEverywhere/issues/760)

## [0.3.8](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.3.7...build-v0.3.8) (2026-01-08)


### Dependencies

* upgrade chokidar to 5.0.0 + replace tiny-glob with tinyglobby ([#753](https://github.com/climateinteractive/SDEverywhere/issues/753)) ([c0e7e62](https://github.com/climateinteractive/SDEverywhere/commit/c0e7e62a3e9af7a5bbe88e00dfa868c021236ba8)), closes [#752](https://github.com/climateinteractive/SDEverywhere/issues/752)

## [0.3.7](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.3.6...build-v0.3.7) (2024-12-13)


### Bug Fixes

* remove duplicate implementations of canonical[Var]Name functions ([#580](https://github.com/climateinteractive/SDEverywhere/issues/580)) ([e215d7d](https://github.com/climateinteractive/SDEverywhere/commit/e215d7de5e2fe551a0dd4cb6e3a960180db4b76f)), closes [#578](https://github.com/climateinteractive/SDEverywhere/issues/578)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/parse bumped from ^0.1.1 to ^0.1.2

## [0.3.6](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.3.5...build-v0.3.6) (2024-08-23)


### Bug Fixes

* upgrade to vite 5.x + upgrade related packages ([#519](https://github.com/climateinteractive/SDEverywhere/issues/519)) ([b89d013](https://github.com/climateinteractive/SDEverywhere/commit/b89d01319c355fc087b382fd299a7231bf942fc2)), closes [#518](https://github.com/climateinteractive/SDEverywhere/issues/518)

## [0.3.5](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.3.4...build-v0.3.5) (2024-08-17)


### Features

* add bundleListing, customLookups, and customOutputs settings to control code generation ([#504](https://github.com/climateinteractive/SDEverywhere/issues/504)) ([fcea642](https://github.com/climateinteractive/SDEverywhere/commit/fcea642a8e0bcd23e3ebf07983f1f30415b4f81d)), closes [#503](https://github.com/climateinteractive/SDEverywhere/issues/503)
* add optional `outListingFile` config property that copies model listing JSON file as post-generate step ([#493](https://github.com/climateinteractive/SDEverywhere/issues/493)) ([af4abbe](https://github.com/climateinteractive/SDEverywhere/commit/af4abbe09102950f9fe7576ed3b23bea57ec3443)), closes [#492](https://github.com/climateinteractive/SDEverywhere/issues/492)
* change ModelSpec to allow for simple array of input/output var names ([#495](https://github.com/climateinteractive/SDEverywhere/issues/495)) ([3130901](https://github.com/climateinteractive/SDEverywhere/commit/31309017e207ac6ce0d0bcd20499b12b5b918bb9)), closes [#494](https://github.com/climateinteractive/SDEverywhere/issues/494)


### Bug Fixes

* update build and plugin packages to support JS code generation ([#487](https://github.com/climateinteractive/SDEverywhere/issues/487)) ([18b0873](https://github.com/climateinteractive/SDEverywhere/commit/18b0873e74facea772e56f59a1ba4470ebb1fdd6)), closes [#479](https://github.com/climateinteractive/SDEverywhere/issues/479)

## [0.3.4](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.3.3...build-v0.3.4) (2024-02-23)


### Bug Fixes

* improve error handling/reporting and prevent premature exit in dev mode ([#434](https://github.com/climateinteractive/SDEverywhere/issues/434)) ([98ab523](https://github.com/climateinteractive/SDEverywhere/commit/98ab523907aa8ebe4dfe22eac0179ffb5364cd2a)), closes [#260](https://github.com/climateinteractive/SDEverywhere/issues/260)

## [0.3.3](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.3.2...build-v0.3.3) (2024-01-17)


### Bug Fixes

* allow `--genc` and `--list` arguments to be used in the same `sde generate` command ([#425](https://github.com/climateinteractive/SDEverywhere/issues/425)) ([9f97332](https://github.com/climateinteractive/SDEverywhere/commit/9f9733245721b7701e20eab8da2a2579834a60c2)), closes [#424](https://github.com/climateinteractive/SDEverywhere/issues/424)

## [0.3.2](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.3.1...build-v0.3.2) (2023-09-28)


### Features

* add support for capturing data for any variable at runtime ([#355](https://github.com/climateinteractive/SDEverywhere/issues/355)) ([5d12836](https://github.com/climateinteractive/SDEverywhere/commit/5d1283657ba99f6c7f8e30f8053f1906ac872af3)), closes [#105](https://github.com/climateinteractive/SDEverywhere/issues/105)

## [0.3.1](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.3.0...build-v0.3.1) (2023-05-03)


### Bug Fixes

* add inputId property to InputSpec interface ([#321](https://github.com/climateinteractive/SDEverywhere/issues/321)) ([f461433](https://github.com/climateinteractive/SDEverywhere/commit/f461433df9ae013e73a76a1103c9cb8a5d22ab52)), closes [#320](https://github.com/climateinteractive/SDEverywhere/issues/320)

## [0.3.0](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.2.0...build-v0.3.0) (2022-12-10)


### ⚠ BREAKING CHANGES

* The `startTime` and `endTime` properties have been removed from the `ModelSpec` interface in the `@sdeverywhere/build` package, so it is no longer necessary for you to provide them in your `sde.config.js` file.

### Bug Fixes

* remove `startTime` and `endTime` from `ModelSpec` interface and handle SAVEPER != 1 ([921014a](https://github.com/climateinteractive/SDEverywhere/commit/921014aeeda646a130ac324823ab5633d6abcdfa))

## [0.2.0](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.1.1...build-v0.2.0) (2022-09-22)


### Features

* add plugin-config package ([#234](https://github.com/climateinteractive/SDEverywhere/issues/234)) ([cfc7be0](https://github.com/climateinteractive/SDEverywhere/commit/cfc7be0f78a88ab1e3f601cba93e8f882e9d072d)), closes [#229](https://github.com/climateinteractive/SDEverywhere/issues/229)


### Bug Fixes

* log build errors in development mode ([#232](https://github.com/climateinteractive/SDEverywhere/issues/232)) ([f0a567b](https://github.com/climateinteractive/SDEverywhere/commit/f0a567b5eaf24a16c7f8c340626489e7285ab5e2)), closes [#231](https://github.com/climateinteractive/SDEverywhere/issues/231)

## [0.1.1](https://github.com/climateinteractive/SDEverywhere/compare/build-v0.1.0...build-v0.1.1) (2022-08-06)


### Bug Fixes

* correct handling of paths on Windows and those containing spaces ([#223](https://github.com/climateinteractive/SDEverywhere/issues/223)) ([c783e81](https://github.com/climateinteractive/SDEverywhere/commit/c783e811a43331e4c563438b8fa441792bdcfe28)), closes [#222](https://github.com/climateinteractive/SDEverywhere/issues/222)

## 0.1.0 (2022-06-28)


### Features

* add build and plugin-{check,vite,wasm,worker} packages ([#206](https://github.com/climateinteractive/SDEverywhere/issues/206)) ([dd34cbf](https://github.com/climateinteractive/SDEverywhere/commit/dd34cbfcc0b8b3fb1655c8aa64fb919f9757b8be)), closes [#203](https://github.com/climateinteractive/SDEverywhere/issues/203)
