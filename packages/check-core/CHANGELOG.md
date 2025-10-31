# Changelog

## [0.1.6](https://github.com/climateinteractive/SDEverywhere/compare/check-core-v0.1.5...check-core-v0.1.6) (2025-10-31)


### Features

* add support for filtering/skipping checks and comparisons in model-check ([#686](https://github.com/climateinteractive/SDEverywhere/issues/686)) ([95a0c53](https://github.com/climateinteractive/SDEverywhere/commit/95a0c53adbb5289041ec8f1e59b2826f406e7869)), closes [#682](https://github.com/climateinteractive/SDEverywhere/issues/682)
* add support for running multiple pairs of model instances concurrently in model-check ([#688](https://github.com/climateinteractive/SDEverywhere/issues/688)) ([db975b0](https://github.com/climateinteractive/SDEverywhere/commit/db975b0d3359cd8bbfc4987f24ce525a44a2b513)), closes [#683](https://github.com/climateinteractive/SDEverywhere/issues/683)
* add Trace View (tracing/diagnosis tool) to model-check ([#684](https://github.com/climateinteractive/SDEverywhere/issues/684)) ([a9f2b1c](https://github.com/climateinteractive/SDEverywhere/commit/a9f2b1c47be651463b1a85ef85078c65faca9ffe)), closes [#675](https://github.com/climateinteractive/SDEverywhere/issues/675)
* allow for different ways of sorting comparisons in model-check ([#693](https://github.com/climateinteractive/SDEverywhere/issues/693)) ([4cf615a](https://github.com/climateinteractive/SDEverywhere/commit/4cf615a68fd4c10ed7b23896023121e5986300f2)), closes [#692](https://github.com/climateinteractive/SDEverywhere/issues/692)


### Bug Fixes

* reduce size of impl var metadata in model-check bundle ([#689](https://github.com/climateinteractive/SDEverywhere/issues/689)) ([58cccb5](https://github.com/climateinteractive/SDEverywhere/commit/58cccb526fd2e86bef40672fe339b0b213c5ac89)), closes [#687](https://github.com/climateinteractive/SDEverywhere/issues/687)

## [0.1.5](https://github.com/climateinteractive/SDEverywhere/compare/check-core-v0.1.4...check-core-v0.1.5) (2025-04-14)


### Features

* add support for scenarios that are specific to each bundle ([#622](https://github.com/climateinteractive/SDEverywhere/issues/622)) ([c762828](https://github.com/climateinteractive/SDEverywhere/commit/c7628280dffe2f2cc7f12fac30051969bc48a18a)), closes [#620](https://github.com/climateinteractive/SDEverywhere/issues/620)

## [0.1.4](https://github.com/climateinteractive/SDEverywhere/compare/check-core-v0.1.3...check-core-v0.1.4) (2025-03-13)


### Features

* allow for customizing sections and ordering in comparison summary+detail views ([#610](https://github.com/climateinteractive/SDEverywhere/issues/610)) ([1d15602](https://github.com/climateinteractive/SDEverywhere/commit/1d15602d7ec92d8e021da9e34cdbeeaf34812a1c)), closes [#608](https://github.com/climateinteractive/SDEverywhere/issues/608)

## [0.1.3](https://github.com/climateinteractive/SDEverywhere/compare/check-core-v0.1.2...check-core-v0.1.3) (2024-10-16)


### Features

* add support for configuring comparison graph groups and order ([#541](https://github.com/climateinteractive/SDEverywhere/issues/541)) ([922a4d4](https://github.com/climateinteractive/SDEverywhere/commit/922a4d4be1d0977904aeb9f5b69e9e96361415ef)), closes [#539](https://github.com/climateinteractive/SDEverywhere/issues/539)
* allow for adding reference plots to a comparison graph ([#550](https://github.com/climateinteractive/SDEverywhere/issues/550)) ([4f0495a](https://github.com/climateinteractive/SDEverywhere/commit/4f0495a65914ebde39af5558bd5f62d73b28fa13)), closes [#549](https://github.com/climateinteractive/SDEverywhere/issues/549)
* allow for customizing the set of context graphs that are displayed for a given dataset/scenario ([#544](https://github.com/climateinteractive/SDEverywhere/issues/544)) ([04f3410](https://github.com/climateinteractive/SDEverywhere/commit/04f341057f5551c2b4ded0e2e86722171f26ea01)), closes [#540](https://github.com/climateinteractive/SDEverywhere/issues/540)
* allow for showing a mix of dataset/scenario combinations in a single comparison view ([#553](https://github.com/climateinteractive/SDEverywhere/issues/553)) ([94fbb09](https://github.com/climateinteractive/SDEverywhere/commit/94fbb09740ac08a707bfd8cb6aaf5321ff0e1e64)), closes [#552](https://github.com/climateinteractive/SDEverywhere/issues/552)

## [0.1.2](https://github.com/climateinteractive/SDEverywhere/compare/check-core-v0.1.1...check-core-v0.1.2) (2024-03-26)


### Features

* add support for comparison scenarios that have different input settings in the two models ([#456](https://github.com/climateinteractive/SDEverywhere/issues/456)) ([e250cdf](https://github.com/climateinteractive/SDEverywhere/commit/e250cdf5a2642cfb66fe217735bcfcb807b028d4)), closes [#453](https://github.com/climateinteractive/SDEverywhere/issues/453)


### Bug Fixes

* define type aliases for some map keys ([#455](https://github.com/climateinteractive/SDEverywhere/issues/455)) ([65560ef](https://github.com/climateinteractive/SDEverywhere/commit/65560efa635c1c4e68f8fb9b5cd9c44a498b598d)), closes [#454](https://github.com/climateinteractive/SDEverywhere/issues/454)

## [0.1.1](https://github.com/climateinteractive/SDEverywhere/compare/check-core-v0.1.0...check-core-v0.1.1) (2023-06-18)


### Features

* allow for defining model comparison scenarios in YAML files ([#330](https://github.com/climateinteractive/SDEverywhere/issues/330)) ([426eab1](https://github.com/climateinteractive/SDEverywhere/commit/426eab19f98df2ccfa56cf9cc8cc83ceedfe7821)), closes [#315](https://github.com/climateinteractive/SDEverywhere/issues/315)

## 0.1.0 (2022-06-28)


### Features

* add build and plugin-{check,vite,wasm,worker} packages ([#206](https://github.com/climateinteractive/SDEverywhere/issues/206)) ([dd34cbf](https://github.com/climateinteractive/SDEverywhere/commit/dd34cbfcc0b8b3fb1655c8aa64fb919f9757b8be)), closes [#203](https://github.com/climateinteractive/SDEverywhere/issues/203)
* add check-core and check-ui-shell packages ([#202](https://github.com/climateinteractive/SDEverywhere/issues/202)) ([8d4fdce](https://github.com/climateinteractive/SDEverywhere/commit/8d4fdceb2efea602b674a7275346e93cc5287990)), closes [#201](https://github.com/climateinteractive/SDEverywhere/issues/201)


### Bug Fixes

* make runSuite proceed to completion when no checks are defined ([#205](https://github.com/climateinteractive/SDEverywhere/issues/205)) ([32b2edb](https://github.com/climateinteractive/SDEverywhere/commit/32b2edbb5cf2680a01e94f6ed142ee2fd73760de)), closes [#204](https://github.com/climateinteractive/SDEverywhere/issues/204)
