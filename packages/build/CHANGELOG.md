# Changelog

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
