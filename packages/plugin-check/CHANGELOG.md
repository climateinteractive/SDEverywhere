# Changelog

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
