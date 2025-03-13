# Changelog

## [0.2.8](https://github.com/climateinteractive/SDEverywhere/compare/check-ui-shell-v0.2.7...check-ui-shell-v0.2.8) (2025-03-13)


### Features

* allow for customizing sections and ordering in comparison summary+detail views ([#610](https://github.com/climateinteractive/SDEverywhere/issues/610)) ([1d15602](https://github.com/climateinteractive/SDEverywhere/commit/1d15602d7ec92d8e021da9e34cdbeeaf34812a1c)), closes [#608](https://github.com/climateinteractive/SDEverywhere/issues/608)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/check-core bumped from ^0.1.3 to ^0.1.4

## [0.2.7](https://github.com/climateinteractive/SDEverywhere/compare/check-ui-shell-v0.2.6...check-ui-shell-v0.2.7) (2024-10-16)


### Bug Fixes

* correct the calculation of the number of rows with differences for a summary tab ([#555](https://github.com/climateinteractive/SDEverywhere/issues/555)) ([dda4d69](https://github.com/climateinteractive/SDEverywhere/commit/dda4d690d7cc2e5b20f4fffd5cdd31d1c4f9bd73)), closes [#554](https://github.com/climateinteractive/SDEverywhere/issues/554)

## [0.2.6](https://github.com/climateinteractive/SDEverywhere/compare/check-ui-shell-v0.2.5...check-ui-shell-v0.2.6) (2024-10-16)


### Features

* add support for configuring comparison graph groups and order ([#541](https://github.com/climateinteractive/SDEverywhere/issues/541)) ([922a4d4](https://github.com/climateinteractive/SDEverywhere/commit/922a4d4be1d0977904aeb9f5b69e9e96361415ef)), closes [#539](https://github.com/climateinteractive/SDEverywhere/issues/539)
* add view option for consistent y-axis limits across a row of comparison graphs ([#548](https://github.com/climateinteractive/SDEverywhere/issues/548)) ([d8ce779](https://github.com/climateinteractive/SDEverywhere/commit/d8ce77975c0c14753a63550652b4a415cc4f1802)), closes [#547](https://github.com/climateinteractive/SDEverywhere/issues/547)
* allow for adding reference plots to a comparison graph ([#550](https://github.com/climateinteractive/SDEverywhere/issues/550)) ([4f0495a](https://github.com/climateinteractive/SDEverywhere/commit/4f0495a65914ebde39af5558bd5f62d73b28fa13)), closes [#549](https://github.com/climateinteractive/SDEverywhere/issues/549)
* allow for customizing the set of context graphs that are displayed for a given dataset/scenario ([#544](https://github.com/climateinteractive/SDEverywhere/issues/544)) ([04f3410](https://github.com/climateinteractive/SDEverywhere/commit/04f341057f5551c2b4ded0e2e86722171f26ea01)), closes [#540](https://github.com/climateinteractive/SDEverywhere/issues/540)
* allow for pinning scenarios/datasets in model-check report ([#551](https://github.com/climateinteractive/SDEverywhere/issues/551)) ([e3b0463](https://github.com/climateinteractive/SDEverywhere/commit/e3b04636909d0fdd57ed9b7b9a0b8b6ab462afc4)), closes [#537](https://github.com/climateinteractive/SDEverywhere/issues/537)
* allow for showing a mix of dataset/scenario combinations in a single comparison view ([#553](https://github.com/climateinteractive/SDEverywhere/issues/553)) ([94fbb09](https://github.com/climateinteractive/SDEverywhere/commit/94fbb09740ac08a707bfd8cb6aaf5321ff0e1e64)), closes [#552](https://github.com/climateinteractive/SDEverywhere/issues/552)


### Bug Fixes

* allow for displaying more than 3 graph boxes in one row in detail view ([#546](https://github.com/climateinteractive/SDEverywhere/issues/546)) ([5a76a03](https://github.com/climateinteractive/SDEverywhere/commit/5a76a035009b8678ef54ddd60f9cd44798efd631)), closes [#545](https://github.com/climateinteractive/SDEverywhere/issues/545)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/check-core bumped from ^0.1.2 to ^0.1.3

## [0.2.5](https://github.com/climateinteractive/SDEverywhere/compare/check-ui-shell-v0.2.4...check-ui-shell-v0.2.5) (2024-08-23)


### Bug Fixes

* upgrade to vite 5.x + upgrade related packages ([#519](https://github.com/climateinteractive/SDEverywhere/issues/519)) ([b89d013](https://github.com/climateinteractive/SDEverywhere/commit/b89d01319c355fc087b382fd299a7231bf942fc2)), closes [#518](https://github.com/climateinteractive/SDEverywhere/issues/518)

## [0.2.4](https://github.com/climateinteractive/SDEverywhere/compare/check-ui-shell-v0.2.3...check-ui-shell-v0.2.4) (2024-03-26)


### Bug Fixes

* correct handling of the case where comparison scenario is not valid for one side ([#451](https://github.com/climateinteractive/SDEverywhere/issues/451)) ([a9d2e34](https://github.com/climateinteractive/SDEverywhere/commit/a9d2e341eced2d062b39ed832b2ecdbd7526aec0)), closes [#450](https://github.com/climateinteractive/SDEverywhere/issues/450)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/check-core bumped from ^0.1.1 to ^0.1.2

## [0.2.3](https://github.com/climateinteractive/SDEverywhere/compare/check-ui-shell-v0.2.2...check-ui-shell-v0.2.3) (2023-09-05)


### Bug Fixes

* upgrade to vite 4.4.9 ([#354](https://github.com/climateinteractive/SDEverywhere/issues/354)) ([db975fa](https://github.com/climateinteractive/SDEverywhere/commit/db975fa47705e22005d0c04500567d3480502f52)), closes [#351](https://github.com/climateinteractive/SDEverywhere/issues/351)

## [0.2.2](https://github.com/climateinteractive/SDEverywhere/compare/check-ui-shell-v0.2.1...check-ui-shell-v0.2.2) (2023-06-18)


### Features

* allow for defining model comparison scenarios in YAML files ([#330](https://github.com/climateinteractive/SDEverywhere/issues/330)) ([426eab1](https://github.com/climateinteractive/SDEverywhere/commit/426eab19f98df2ccfa56cf9cc8cc83ceedfe7821)), closes [#315](https://github.com/climateinteractive/SDEverywhere/issues/315)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/check-core bumped from ^0.1.0 to ^0.1.1

## [0.2.1](https://github.com/climateinteractive/SDEverywhere/compare/check-ui-shell-v0.2.0...check-ui-shell-v0.2.1) (2022-10-29)


### Bug Fixes

* make colors for comparison graph plots match dataset styles ([#280](https://github.com/climateinteractive/SDEverywhere/issues/280)) ([20e7d2b](https://github.com/climateinteractive/SDEverywhere/commit/20e7d2b08b12c9adcce3e9238441475b0dd64723)), closes [#279](https://github.com/climateinteractive/SDEverywhere/issues/279)

## [0.2.0](https://github.com/climateinteractive/SDEverywhere/compare/check-ui-shell-v0.1.1...check-ui-shell-v0.2.0) (2022-09-28)


### Features

* allow for selecting different model-check baseline bundle in local dev mode ([#246](https://github.com/climateinteractive/SDEverywhere/issues/246)) ([6425eb8](https://github.com/climateinteractive/SDEverywhere/commit/6425eb8240d3a7e3e83c7b6e5be5dd837b2a5c57)), closes [#244](https://github.com/climateinteractive/SDEverywhere/issues/244)


### Bug Fixes

* upgrade to vite 3.1.3 ([#242](https://github.com/climateinteractive/SDEverywhere/issues/242)) ([e6ff922](https://github.com/climateinteractive/SDEverywhere/commit/e6ff922f002411b83a9ab0688c5a65433b8f4d61)), closes [#238](https://github.com/climateinteractive/SDEverywhere/issues/238)

## [0.1.1](https://github.com/climateinteractive/SDEverywhere/compare/check-ui-shell-v0.1.0...check-ui-shell-v0.1.1) (2022-07-12)


### Bug Fixes

* move svelte-awesome to devDependencies to avoid peer dependency issues ([#215](https://github.com/climateinteractive/SDEverywhere/issues/215)) ([a75dfe3](https://github.com/climateinteractive/SDEverywhere/commit/a75dfe3e9a7b0910025bb870aa9d21f0079e2d95)), closes [#208](https://github.com/climateinteractive/SDEverywhere/issues/208)

## 0.1.0 (2022-06-28)


### Features

* add check-core and check-ui-shell packages ([#202](https://github.com/climateinteractive/SDEverywhere/issues/202)) ([8d4fdce](https://github.com/climateinteractive/SDEverywhere/commit/8d4fdceb2efea602b674a7275346e93cc5287990)), closes [#201](https://github.com/climateinteractive/SDEverywhere/issues/201)
