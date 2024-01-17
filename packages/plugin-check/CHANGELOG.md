# Changelog

### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @sdeverywhere/build bumped from * to 0.3.3

## [0.3.4](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.3.3...plugin-check-v0.3.4) (2023-09-28)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/runtime bumped from ^0.2.1 to ^0.2.2
    * @sdeverywhere/runtime-async bumped from ^0.2.1 to ^0.2.2

## [0.3.3](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.3.2...plugin-check-v0.3.3) (2023-09-28)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/runtime bumped from ^0.2.0 to ^0.2.1
    * @sdeverywhere/runtime-async bumped from ^0.2.0 to ^0.2.1

## [0.3.2](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.3.1...plugin-check-v0.3.2) (2023-09-05)


### Bug Fixes

* upgrade to vite 4.4.9 ([#354](https://github.com/climateinteractive/SDEverywhere/issues/354)) ([db975fa](https://github.com/climateinteractive/SDEverywhere/commit/db975fa47705e22005d0c04500567d3480502f52)), closes [#351](https://github.com/climateinteractive/SDEverywhere/issues/351)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/check-ui-shell bumped from ^0.2.2 to ^0.2.3

## [0.3.1](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.3.0...plugin-check-v0.3.1) (2023-06-18)


### Features

* allow for defining model comparison scenarios in YAML files ([#330](https://github.com/climateinteractive/SDEverywhere/issues/330)) ([426eab1](https://github.com/climateinteractive/SDEverywhere/commit/426eab19f98df2ccfa56cf9cc8cc83ceedfe7821)), closes [#315](https://github.com/climateinteractive/SDEverywhere/issues/315)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/check-core bumped from ^0.1.0 to ^0.1.1
    * @sdeverywhere/check-ui-shell bumped from ^0.2.1 to ^0.2.2

## [0.3.0](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.2.2...plugin-check-v0.3.0) (2022-12-10)


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

## [0.2.2](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.2.1...plugin-check-v0.2.2) (2022-10-28)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/check-ui-shell bumped from ^0.2.0 to ^0.2.1

## [0.2.1](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.2.0...plugin-check-v0.2.1) (2022-09-30)


### Bug Fixes

* make plugin-check automatically copy current bundle to baselines ([#257](https://github.com/climateinteractive/SDEverywhere/issues/257)) ([0462f7f](https://github.com/climateinteractive/SDEverywhere/commit/0462f7f94b71bfcd71b71d2d74c34f58096fd1e2)), closes [#256](https://github.com/climateinteractive/SDEverywhere/issues/256)

## [0.2.0](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.1.5...plugin-check-v0.2.0) (2022-09-28)


### Features

* allow for selecting different model-check baseline bundle in local dev mode ([#246](https://github.com/climateinteractive/SDEverywhere/issues/246)) ([6425eb8](https://github.com/climateinteractive/SDEverywhere/commit/6425eb8240d3a7e3e83c7b6e5be5dd837b2a5c57)), closes [#244](https://github.com/climateinteractive/SDEverywhere/issues/244)


### Bug Fixes

* make build package a peer dependency for plugins ([#241](https://github.com/climateinteractive/SDEverywhere/issues/241)) ([05ea85f](https://github.com/climateinteractive/SDEverywhere/commit/05ea85f256ceed064018cdfab1bd6d52a7dca735)), closes [#237](https://github.com/climateinteractive/SDEverywhere/issues/237)
* upgrade to vite 3.1.3 ([#242](https://github.com/climateinteractive/SDEverywhere/issues/242)) ([e6ff922](https://github.com/climateinteractive/SDEverywhere/commit/e6ff922f002411b83a9ab0688c5a65433b8f4d61)), closes [#238](https://github.com/climateinteractive/SDEverywhere/issues/238)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/check-ui-shell bumped from ^0.1.1 to ^0.2.0


## [0.1.5](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.1.4...plugin-check-v0.1.5) (2022-09-21)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/build bumped from ^0.1.1 to ^0.2.0


## [0.1.4](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.1.3...plugin-check-v0.1.4) (2022-08-09)


### Bug Fixes

* exclude moment dependency in plugin-check report config ([#226](https://github.com/climateinteractive/SDEverywhere/issues/226)) ([3e9da1a](https://github.com/climateinteractive/SDEverywhere/commit/3e9da1a5d1aefa73bea1538b6bd7e0990bc10c2f)), closes [#225](https://github.com/climateinteractive/SDEverywhere/issues/225)

## [0.1.3](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.1.2...plugin-check-v0.1.3) (2022-08-06)


### Bug Fixes

* correct handling of paths on Windows and those containing spaces ([#223](https://github.com/climateinteractive/SDEverywhere/issues/223)) ([c783e81](https://github.com/climateinteractive/SDEverywhere/commit/c783e811a43331e4c563438b8fa441792bdcfe28)), closes [#222](https://github.com/climateinteractive/SDEverywhere/issues/222)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/build bumped from ^0.1.0 to ^0.1.1

## [0.1.2](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.1.1...plugin-check-v0.1.2) (2022-07-12)


### Bug Fixes

* add explicit "optimizeDeps.include" entries for check report Vite config ([#220](https://github.com/climateinteractive/SDEverywhere/issues/220)) ([b79ddb1](https://github.com/climateinteractive/SDEverywhere/commit/b79ddb199a28e81a66c8c420ee00929ae698e8d8)), closes [#219](https://github.com/climateinteractive/SDEverywhere/issues/219)

## [0.1.1](https://github.com/climateinteractive/SDEverywhere/compare/plugin-check-v0.1.0...plugin-check-v0.1.1) (2022-07-12)


### Bug Fixes

* add rollup as dependency to avoid issues with transitive peerDependencies ([#214](https://github.com/climateinteractive/SDEverywhere/issues/214)) ([4ca5052](https://github.com/climateinteractive/SDEverywhere/commit/4ca50521ddac2f6d9434b20cd272684bf26d95e2)), closes [#209](https://github.com/climateinteractive/SDEverywhere/issues/209)
* configure cacheDir in Vite config for plugin-check report ([#216](https://github.com/climateinteractive/SDEverywhere/issues/216)) ([7d54e16](https://github.com/climateinteractive/SDEverywhere/commit/7d54e160cbbf07d5d2642b6f8b769713167f298e)), closes [#207](https://github.com/climateinteractive/SDEverywhere/issues/207)
* generate default test config on first build in dev mode ([#217](https://github.com/climateinteractive/SDEverywhere/issues/217)) ([c6ab511](https://github.com/climateinteractive/SDEverywhere/commit/c6ab511c509dc6eac132e12ed386180b00d63680)), closes [#211](https://github.com/climateinteractive/SDEverywhere/issues/211)
* remove rollup-plugin-node-polyfills dependency and use custom no-op polyfills ([#212](https://github.com/climateinteractive/SDEverywhere/issues/212)) ([b3c3f20](https://github.com/climateinteractive/SDEverywhere/commit/b3c3f20bf6e6a41efc2854f694cebb0579263e4c)), closes [#210](https://github.com/climateinteractive/SDEverywhere/issues/210)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/check-ui-shell bumped from ^0.1.0 to ^0.1.1

## 0.1.0 (2022-06-28)


### Features

* add build and plugin-{check,vite,wasm,worker} packages ([#206](https://github.com/climateinteractive/SDEverywhere/issues/206)) ([dd34cbf](https://github.com/climateinteractive/SDEverywhere/commit/dd34cbfcc0b8b3fb1655c8aa64fb919f9757b8be)), closes [#203](https://github.com/climateinteractive/SDEverywhere/issues/203)
