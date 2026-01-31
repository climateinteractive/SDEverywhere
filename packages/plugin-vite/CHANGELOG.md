# Changelog

## [0.2.1](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.2.0...plugin-vite-v0.2.1) (2026-01-08)


### Dependencies

* upgrade vite to ^7.1.12 + upgrade vitest to ^4.0.16 ([#735](https://github.com/climateinteractive/SDEverywhere/issues/735)) ([f16f127](https://github.com/climateinteractive/SDEverywhere/commit/f16f127b9fb0e53352d7e1152d78623fe5ec26c9)), closes [#734](https://github.com/climateinteractive/SDEverywhere/issues/734)

## [0.2.0](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.11...plugin-vite-v0.2.0) (2025-10-08)


### ⚠ BREAKING CHANGES

* The plugin-vite package now requires vite 5.x, 6.x, or 7.x; we have dropped support for vite 3.x and 4.x in the `peerDependencies` for plugin-vite.  Most SDE users will not be affected by this change since they pick up whatever version of vite was configured in the project templates.  If you have an existing SDE project that uses an older version of vite, simply update your `package.json` file and change the vite dependency version to `^7.1.9` or later and things should continue to work just fine.

### Dependencies

* drop support for vite &lt;= 4 in plugin-vite ([ca98afc](https://github.com/climateinteractive/SDEverywhere/commit/ca98afca6fd2fa482bb5112783ce96473fa055a9))
* upgrade to vite 7.1.9 + svelte 5.39.10 ([39108d2](https://github.com/climateinteractive/SDEverywhere/commit/39108d2cd2973c25a3394778191a4d618dc30640))

## [0.1.11](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.10...plugin-vite-v0.1.11) (2024-12-13)


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.3.6 to ^0.3.7

## [0.1.10](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.9...plugin-vite-v0.1.10) (2024-08-23)


### Bug Fixes

* upgrade to vite 5.x + upgrade related packages ([#519](https://github.com/climateinteractive/SDEverywhere/issues/519)) ([b89d013](https://github.com/climateinteractive/SDEverywhere/commit/b89d01319c355fc087b382fd299a7231bf942fc2)), closes [#518](https://github.com/climateinteractive/SDEverywhere/issues/518)


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.3.5 to ^0.3.6

## [0.1.9](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.8...plugin-vite-v0.1.9) (2024-08-17)


### Features

* add compiler and runtime support for generating pure JS models ([#486](https://github.com/climateinteractive/SDEverywhere/issues/486)) ([42d4dc6](https://github.com/climateinteractive/SDEverywhere/commit/42d4dc6da2fba3b34474c634374e07bc56d72868)), closes [#437](https://github.com/climateinteractive/SDEverywhere/issues/437)


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @sdeverywhere/build bumped from ^0.3.0 to ^0.3.5

## [0.1.8](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.7...plugin-vite-v0.1.8) (2023-09-29)

Note: This is a redo of the 0.1.7 release to workaround an npmjs registry issue.  There are no actual changes in this release.


## [0.1.7](https://github.com/climateinteractive/SDEverywhere/compare/plugin-vite-v0.1.6...plugin-vite-v0.1.7) (2023-09-28)


### Bug Fixes

* add trivial changes to correct previous publish failures and force re-publish ([#362](https://github.com/climateinteractive/SDEverywhere/issues/362)) ([544d4da](https://github.com/climateinteractive/SDEverywhere/commit/544d4dac5f5d6d71885f9ba15f95ee9c91e0ec66)), closes [#361](https://github.com/climateinteractive/SDEverywhere/issues/361)

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
