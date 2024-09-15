# Changelog

## [0.7.20](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.19...compile-v0.7.20) (2024-09-15)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @sdeverywhere/parse bumped from ^0.1.0 to ^0.1.1

## [0.7.19](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.18...compile-v0.7.19) (2024-08-28)


### Bug Fixes

* cache sorted variables to improve compile performance ([#531](https://github.com/climateinteractive/SDEverywhere/issues/531)) ([0c359c8](https://github.com/climateinteractive/SDEverywhere/commit/0c359c842d0692e78df54f16f559d13f9ee713b9)), closes [#528](https://github.com/climateinteractive/SDEverywhere/issues/528)
* include 'initial' variables in JSON model listing ([#529](https://github.com/climateinteractive/SDEverywhere/issues/529)) ([2e1a004](https://github.com/climateinteractive/SDEverywhere/commit/2e1a004555c9d30658179900bca099d1ad4820ea)), closes [#527](https://github.com/climateinteractive/SDEverywhere/issues/527)

## [0.7.18](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.17...compile-v0.7.18) (2024-08-17)


### Features

* add bundleListing, customLookups, and customOutputs settings to control code generation ([#504](https://github.com/climateinteractive/SDEverywhere/issues/504)) ([fcea642](https://github.com/climateinteractive/SDEverywhere/commit/fcea642a8e0bcd23e3ebf07983f1f30415b4f81d)), closes [#503](https://github.com/climateinteractive/SDEverywhere/issues/503)
* add compiler and runtime support for generating pure JS models ([#486](https://github.com/climateinteractive/SDEverywhere/issues/486)) ([42d4dc6](https://github.com/climateinteractive/SDEverywhere/commit/42d4dc6da2fba3b34474c634374e07bc56d72868)), closes [#437](https://github.com/climateinteractive/SDEverywhere/issues/437)
* add support for GAME function and for providing gaming inputs at runtime ([#505](https://github.com/climateinteractive/SDEverywhere/issues/505)) ([338e91e](https://github.com/climateinteractive/SDEverywhere/commit/338e91edff16ce47109ef50cdbddef9ae7a27fa2)), closes [#483](https://github.com/climateinteractive/SDEverywhere/issues/483)
* allow for creating a LookupDef without manually initializing a ModelListing ([#502](https://github.com/climateinteractive/SDEverywhere/issues/502)) ([5690055](https://github.com/climateinteractive/SDEverywhere/commit/569005502d2240a22b6a31284215b89ec1f8de05)), closes [#501](https://github.com/climateinteractive/SDEverywhere/issues/501)
* allow for overriding data variables and lookups at runtime ([#490](https://github.com/climateinteractive/SDEverywhere/issues/490)) ([6c888e8](https://github.com/climateinteractive/SDEverywhere/commit/6c888e887336e7b874dbde7e318e993936296c48)), closes [#472](https://github.com/climateinteractive/SDEverywhere/issues/472)


### Bug Fixes

* change encoding of variable and lookup indices to allow for arbitrary number of subscripts ([#507](https://github.com/climateinteractive/SDEverywhere/issues/507)) ([697e943](https://github.com/climateinteractive/SDEverywhere/commit/697e94397ca00b33d2e6216d63f4cfbc2f160fa0)), closes [#506](https://github.com/climateinteractive/SDEverywhere/issues/506)
* remove old implementation of read and code gen phases ([#473](https://github.com/climateinteractive/SDEverywhere/issues/473)) ([8de0d16](https://github.com/climateinteractive/SDEverywhere/commit/8de0d167a59d0722352e73c31cbbdd7c09ac150f)), closes [#448](https://github.com/climateinteractive/SDEverywhere/issues/448)
* update build and plugin packages to support JS code generation ([#487](https://github.com/climateinteractive/SDEverywhere/issues/487)) ([18b0873](https://github.com/climateinteractive/SDEverywhere/commit/18b0873e74facea772e56f59a1ba4470ebb1fdd6)), closes [#479](https://github.com/climateinteractive/SDEverywhere/issues/479)

## [0.7.17](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.16...compile-v0.7.17) (2024-04-22)


### Bug Fixes

* use original Vensim names in generated headers for spec output vars ([#462](https://github.com/climateinteractive/SDEverywhere/issues/462)) ([966066a](https://github.com/climateinteractive/SDEverywhere/commit/966066ac9a5a3f005acf491f3c77637199a1b1ad)), closes [#461](https://github.com/climateinteractive/SDEverywhere/issues/461)

## [0.7.16](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.15...compile-v0.7.16) (2024-04-19)


### Bug Fixes

* upgrade to more recent version of xlsx package ([#465](https://github.com/climateinteractive/SDEverywhere/issues/465)) ([8d06b81](https://github.com/climateinteractive/SDEverywhere/commit/8d06b81875a4a86d965ff75ec02c015e3f55653e)), closes [#463](https://github.com/climateinteractive/SDEverywhere/issues/463)

## [0.7.15](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.14...compile-v0.7.15) (2024-04-17)


### Bug Fixes

* correct generation of level variables when SMOOTH3[I] input param has subscripts but delay param does not ([#457](https://github.com/climateinteractive/SDEverywhere/issues/457)) ([fd3bfab](https://github.com/climateinteractive/SDEverywhere/commit/fd3bfab25a48bdd90f028573246169acfb8b9d25)), closes [#313](https://github.com/climateinteractive/SDEverywhere/issues/313)

## [0.7.14](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.13...compile-v0.7.14) (2024-03-12)


### Bug Fixes

* make new implementation of read and code gen phases the default ([#446](https://github.com/climateinteractive/SDEverywhere/issues/446)) ([e0e6d40](https://github.com/climateinteractive/SDEverywhere/commit/e0e6d40d6365085185f6dd4eff714a268bab5a28)), closes [#445](https://github.com/climateinteractive/SDEverywhere/issues/445)

## [0.7.13](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.12...compile-v0.7.13) (2024-03-11)


### Bug Fixes

* prevent subscripted input variables from being pruned ([#439](https://github.com/climateinteractive/SDEverywhere/issues/439)) ([876dad7](https://github.com/climateinteractive/SDEverywhere/commit/876dad7b3d058908584fff0fc5eab01e99408099)), closes [#438](https://github.com/climateinteractive/SDEverywhere/issues/438)
* rewrite recordRefsOfVariable to avoid blowing the stack ([#443](https://github.com/climateinteractive/SDEverywhere/issues/443)) ([a2bbce9](https://github.com/climateinteractive/SDEverywhere/commit/a2bbce9517c7d9f733339d0ef4534a11acdf784c)), closes [#442](https://github.com/climateinteractive/SDEverywhere/issues/442)

## [0.7.12](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.11...compile-v0.7.12) (2024-02-23)


### Bug Fixes

* improve error handling/reporting and prevent premature exit in dev mode ([#434](https://github.com/climateinteractive/SDEverywhere/issues/434)) ([98ab523](https://github.com/climateinteractive/SDEverywhere/commit/98ab523907aa8ebe4dfe22eac0179ffb5364cd2a)), closes [#260](https://github.com/climateinteractive/SDEverywhere/issues/260)

## [0.7.11](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.10...compile-v0.7.11) (2024-01-17)


### Bug Fixes

* add new expandVarNames function that works with both old and new parsers ([#423](https://github.com/climateinteractive/SDEverywhere/issues/423)) ([2964887](https://github.com/climateinteractive/SDEverywhere/commit/296488775b963fd4ff1ff343fea8c4f3f13e2820)), closes [#422](https://github.com/climateinteractive/SDEverywhere/issues/422)
* add new implementation of read and code gen phases based on `parse` package ([#413](https://github.com/climateinteractive/SDEverywhere/issues/413)) ([5538a4f](https://github.com/climateinteractive/SDEverywhere/commit/5538a4f86ea8d59052d532b47e8077baff084079)), closes [#412](https://github.com/climateinteractive/SDEverywhere/issues/412)
* allow `--genc` and `--list` arguments to be used in the same `sde generate` command ([#425](https://github.com/climateinteractive/SDEverywhere/issues/425)) ([9f97332](https://github.com/climateinteractive/SDEverywhere/commit/9f9733245721b7701e20eab8da2a2579834a60c2)), closes [#424](https://github.com/climateinteractive/SDEverywhere/issues/424)

## [0.7.10](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.9...compile-v0.7.10) (2023-11-15)


### Bug Fixes

* allow lowercase cell reference in GET DIRECT function calls ([#396](https://github.com/climateinteractive/SDEverywhere/issues/396)) ([76f890c](https://github.com/climateinteractive/SDEverywhere/commit/76f890ca7c31eddcfa30df0c8d8300876555d190)), closes [#395](https://github.com/climateinteractive/SDEverywhere/issues/395)
* handle case where subscript/index appears in expression position ([#398](https://github.com/climateinteractive/SDEverywhere/issues/398)) ([7ff1380](https://github.com/climateinteractive/SDEverywhere/commit/7ff1380b11d259ac55bc26cef69948f35fa367cc)), closes [#397](https://github.com/climateinteractive/SDEverywhere/issues/397)
* handle XLSX files in GET DIRECT {CONSTANTS,DATA,LOOKUPS} ([#400](https://github.com/climateinteractive/SDEverywhere/issues/400)) ([16b1ddf](https://github.com/climateinteractive/SDEverywhere/commit/16b1ddf85139c8d4ee5791b0447a43481d4ec49c)), closes [#399](https://github.com/climateinteractive/SDEverywhere/issues/399)

## [0.7.9](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.8...compile-v0.7.9) (2023-10-18)


### Bug Fixes

* allow numeric ranges in subscript range definitions ([#375](https://github.com/climateinteractive/SDEverywhere/issues/375)) ([da13dc4](https://github.com/climateinteractive/SDEverywhere/commit/da13dc407f5f38c5c41501457880e3560c47f7b0)), closes [#318](https://github.com/climateinteractive/SDEverywhere/issues/318)
* correct handling of lookups defined by GET DIRECT LOOKUPS when used as function call arguments ([#379](https://github.com/climateinteractive/SDEverywhere/issues/379)) ([a032779](https://github.com/climateinteractive/SDEverywhere/commit/a032779aeff986f16043f874aa9fc8b47a98d167)), closes [#378](https://github.com/climateinteractive/SDEverywhere/issues/378)

## [0.7.8](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.7...compile-v0.7.8) (2023-09-29)


### Bug Fixes

* prevent error in JSON listing creation when Time variable is not explicitly referenced in the model ([#368](https://github.com/climateinteractive/SDEverywhere/issues/368)) ([4bf0a39](https://github.com/climateinteractive/SDEverywhere/commit/4bf0a39cbe7c9fce8725269b7bb32a59b9f6e027)), closes [#365](https://github.com/climateinteractive/SDEverywhere/issues/365)

## [0.7.7](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.6...compile-v0.7.7) (2023-09-28)


### Features

* add support for capturing data for any variable at runtime ([#355](https://github.com/climateinteractive/SDEverywhere/issues/355)) ([5d12836](https://github.com/climateinteractive/SDEverywhere/commit/5d1283657ba99f6c7f8e30f8053f1906ac872af3)), closes [#105](https://github.com/climateinteractive/SDEverywhere/issues/105)

## [0.7.6](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.5...compile-v0.7.6) (2023-09-05)


### Bug Fixes

* change ramda imports to wildcard style ([#350](https://github.com/climateinteractive/SDEverywhere/issues/350)) ([f132c8d](https://github.com/climateinteractive/SDEverywhere/commit/f132c8d46411257474ec985e92c7a52bf0408542)), closes [#349](https://github.com/climateinteractive/SDEverywhere/issues/349)

## [0.7.5](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.4...compile-v0.7.5) (2023-01-26)


### Bug Fixes

* read blank lines and blank cells in CSV files ([#309](https://github.com/climateinteractive/SDEverywhere/issues/309)) ([1a9fa37](https://github.com/climateinteractive/SDEverywhere/commit/1a9fa37450301300c04dce05762ca9120a80f2f0)), closes [#308](https://github.com/climateinteractive/SDEverywhere/issues/308)

## [0.7.4](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.3...compile-v0.7.4) (2022-12-13)


### Bug Fixes

* initialize control parameters prior to access ([#304](https://github.com/climateinteractive/SDEverywhere/issues/304)) ([365bbb2](https://github.com/climateinteractive/SDEverywhere/commit/365bbb2b751effd7b903cd2848b271ec0c19d243)), closes [#301](https://github.com/climateinteractive/SDEverywhere/issues/301)

## [0.7.3](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.2...compile-v0.7.3) (2022-12-10)


### Features

* expose accessor functions for control parameters ([#296](https://github.com/climateinteractive/SDEverywhere/issues/296)) ([a44d097](https://github.com/climateinteractive/SDEverywhere/commit/a44d0977d14daf4104e17d2710a812e0986d35a5)), closes [#295](https://github.com/climateinteractive/SDEverywhere/issues/295)


### Bug Fixes

* upgrade csv-parse to 5.3.3 and update option names ([#300](https://github.com/climateinteractive/SDEverywhere/issues/300)) ([71d0c8b](https://github.com/climateinteractive/SDEverywhere/commit/71d0c8b2d0e5f4737f968975a16bfd7b2d47b87a)), closes [#299](https://github.com/climateinteractive/SDEverywhere/issues/299)

## [0.7.2](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.1...compile-v0.7.2) (2022-12-09)


### Bug Fixes

* check for valid numbers when reading a CSV file ([#288](https://github.com/climateinteractive/SDEverywhere/issues/288)) ([7fa249e](https://github.com/climateinteractive/SDEverywhere/commit/7fa249ec14af298926b865bb437034b7f1bc6b24))

## [0.7.1](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.7.0...compile-v0.7.1) (2022-10-25)


### Features

* implement DEPRECIATE STRAIGHTLINE ([#264](https://github.com/climateinteractive/SDEverywhere/issues/264)) ([e93101e](https://github.com/climateinteractive/SDEverywhere/commit/e93101e64cce34ffa53ff31d3307de25ada0d4ce)), closes [#258](https://github.com/climateinteractive/SDEverywhere/issues/258)

## [0.7.0](https://github.com/climateinteractive/SDEverywhere/compare/compile-v0.6.0...compile-v0.7.0) (2022-06-28)


### ⚠ BREAKING CHANGES

* The `sdeverywhere` package is deprecated and effectively replaced by `@sdeverywhere/cli`.  Additionally, the `sde generate --genhtml` command and supporting code has been removed and will be replaced with a different solution in the near future.

### Features

* refactor into monorepo with compile and cli packages ([#192](https://github.com/climateinteractive/SDEverywhere/issues/192)) ([8946f18](https://github.com/climateinteractive/SDEverywhere/commit/8946f1854a116f7e9935d5e93d4485865d06d114)), closes [#191](https://github.com/climateinteractive/SDEverywhere/issues/191)

## [0.6.0](https://github.com/climateinteractive/SDEverywhere/compare/0.5.3...sdeverywhere-v0.6.0) (2022-06-04)


### Features

* add `runModelWithBuffers` entry point that takes pre-allocated input/output buffers ([#50](https://github.com/climateinteractive/SDEverywhere/issues/50)) ([083109a](https://github.com/climateinteractive/SDEverywhere/commit/083109a1f03d9648c6a30efbdfbd3d1543d81cfd)), closes [#49](https://github.com/climateinteractive/SDEverywhere/issues/49)
* add basic support for GET DATA BETWEEN TIMES function ([#42](https://github.com/climateinteractive/SDEverywhere/issues/42)) ([8a294aa](https://github.com/climateinteractive/SDEverywhere/commit/8a294aa5f65c1ffc76a397c77257c02687988770)), closes [#33](https://github.com/climateinteractive/SDEverywhere/issues/33)
* add sde command for flattening parent+submodels ([#59](https://github.com/climateinteractive/SDEverywhere/issues/59)) ([50e11ec](https://github.com/climateinteractive/SDEverywhere/commit/50e11ec69ff0c09d84b72a9b16a8ae3d7d3c1433)), closes [#58](https://github.com/climateinteractive/SDEverywhere/issues/58)
* add support for external data variables that use subscript or dimension ([#41](https://github.com/climateinteractive/SDEverywhere/issues/41)) ([035ab5c](https://github.com/climateinteractive/SDEverywhere/commit/035ab5cb88a7e1ff79423cccacde3b827ce8d0dd)), closes [#32](https://github.com/climateinteractive/SDEverywhere/issues/32)
* add support for external data variables with > 2 dimensions ([#47](https://github.com/climateinteractive/SDEverywhere/issues/47)) ([6683e63](https://github.com/climateinteractive/SDEverywhere/commit/6683e63a90cc45fe5109a39c5918ae6d05c878cd)), closes [#45](https://github.com/climateinteractive/SDEverywhere/issues/45)
* allow for specifying I/O variables using Vensim names in spec file ([#61](https://github.com/climateinteractive/SDEverywhere/issues/61)) ([a6bc98d](https://github.com/climateinteractive/SDEverywhere/commit/a6bc98d48f267cbc05244a0749e1108be680f3f7)), closes [#60](https://github.com/climateinteractive/SDEverywhere/issues/60)
* implement ALLOCATE AVAILABLE function ([#106](https://github.com/climateinteractive/SDEverywhere/issues/106)) ([ebd0311](https://github.com/climateinteractive/SDEverywhere/commit/ebd031160d80e52faa7b98f6e1f1d73fcbca1e15))
* implement DELAY FIXED function ([#108](https://github.com/climateinteractive/SDEverywhere/issues/108)) ([bd3b3e8](https://github.com/climateinteractive/SDEverywhere/commit/bd3b3e8163bc95dc6957442277311e31b5c4bef9)), closes [#29](https://github.com/climateinteractive/SDEverywhere/issues/29)
* implement GET DIRECT CONSTANTS for CSV ([#86](https://github.com/climateinteractive/SDEverywhere/issues/86)) ([beedd4f](https://github.com/climateinteractive/SDEverywhere/commit/beedd4f1efec31490076badc910fd20003829044))
* implement GET DIRECT DATA for CSV ([#82](https://github.com/climateinteractive/SDEverywhere/issues/82)) ([b40e738](https://github.com/climateinteractive/SDEverywhere/commit/b40e738389f315984206bac9f9d28f6555549180)), closes [#81](https://github.com/climateinteractive/SDEverywhere/issues/81)
* implement GET DIRECT LOOKUPS including a test model ([#99](https://github.com/climateinteractive/SDEverywhere/issues/99)) ([47f6fe5](https://github.com/climateinteractive/SDEverywhere/commit/47f6fe5d4188b3d14703ff7730d5c874c296df60)), closes [#98](https://github.com/climateinteractive/SDEverywhere/issues/98)
* implement GET DIRECT SUBSCRIPT for CSV ([#79](https://github.com/climateinteractive/SDEverywhere/issues/79)) ([51691e7](https://github.com/climateinteractive/SDEverywhere/commit/51691e7a209cb01911756ff54037dd756a5d439e))
* implement NPV function ([#95](https://github.com/climateinteractive/SDEverywhere/issues/95)) ([9fa17eb](https://github.com/climateinteractive/SDEverywhere/commit/9fa17eb0f2b2a7ef63608771cb8234eaa3c2b35e)), closes [#94](https://github.com/climateinteractive/SDEverywhere/issues/94)
* implement QUANTUM function ([#89](https://github.com/climateinteractive/SDEverywhere/issues/89)) ([42225f9](https://github.com/climateinteractive/SDEverywhere/commit/42225f9508337cd6dbb0e31c2e5f73269f4b526a)), closes [#87](https://github.com/climateinteractive/SDEverywhere/issues/87)
* implement the <-> subscript alias operator ([#80](https://github.com/climateinteractive/SDEverywhere/issues/80)) ([a43917f](https://github.com/climateinteractive/SDEverywhere/commit/a43917f63e0830530c2faf2b76bc65dc90da7533)), closes [#78](https://github.com/climateinteractive/SDEverywhere/issues/78)
* increase the number of dimension and array loop index vars ([#138](https://github.com/climateinteractive/SDEverywhere/issues/138)) ([4c66470](https://github.com/climateinteractive/SDEverywhere/commit/4c6647069582632e89845b2f08b73348c5cc63e6)), closes [#137](https://github.com/climateinteractive/SDEverywhere/issues/137)
* remove inline comments in the preprocessor ([#74](https://github.com/climateinteractive/SDEverywhere/issues/74)) ([d23b1c3](https://github.com/climateinteractive/SDEverywhere/commit/d23b1c355c8b936d704f7ed4affa012b0eb27356))
* sort equations alphabetically when preprocessing mdl file ([#56](https://github.com/climateinteractive/SDEverywhere/issues/56)) ([bb968f7](https://github.com/climateinteractive/SDEverywhere/commit/bb968f79348401ceb9c75930fb66ff32ac7c453f)), closes [#55](https://github.com/climateinteractive/SDEverywhere/issues/55)


### Bug Fixes

* abort code generation on finding a lookup of size zero ([#162](https://github.com/climateinteractive/SDEverywhere/issues/162)) ([44c1202](https://github.com/climateinteractive/SDEverywhere/commit/44c1202aaa113505132ab86a49d8ad7f3bee8673)), closes [#161](https://github.com/climateinteractive/SDEverywhere/issues/161)
* add async and await to some chained cli functions ([#37](https://github.com/climateinteractive/SDEverywhere/issues/37)) ([afdbb77](https://github.com/climateinteractive/SDEverywhere/commit/afdbb773db6fdfb8f7ba8d35782254307389f895)), closes [#35](https://github.com/climateinteractive/SDEverywhere/issues/35)
* allow > 2 dimensions when generating Vensim array names ([#155](https://github.com/climateinteractive/SDEverywhere/issues/155)) ([6575ea9](https://github.com/climateinteractive/SDEverywhere/commit/6575ea9c3d8b72e4d172c4add00bf7f1d2cf33bf)), closes [#154](https://github.com/climateinteractive/SDEverywhere/issues/154)
* allow extra index subscripts in 2D const lists ([#110](https://github.com/climateinteractive/SDEverywhere/issues/110)) ([f5494af](https://github.com/climateinteractive/SDEverywhere/commit/f5494afd1837aebbea5d1cdb329447aa5904d264)), closes [#109](https://github.com/climateinteractive/SDEverywhere/issues/109)
* allow GET DIRECT CONSTANTS to use 2 subscripts in the same family ([#144](https://github.com/climateinteractive/SDEverywhere/issues/144)) ([e53d876](https://github.com/climateinteractive/SDEverywhere/commit/e53d876571a6b89705c007f5d2ebf0de366b09e3)), closes [#143](https://github.com/climateinteractive/SDEverywhere/issues/143)
* correct declarations when subscripted variable is initialized from data and constants ([#116](https://github.com/climateinteractive/SDEverywhere/issues/116)) ([7c51641](https://github.com/climateinteractive/SDEverywhere/commit/7c51641223b869d5cff7e5b28692344134d5e4ee)), closes [#115](https://github.com/climateinteractive/SDEverywhere/issues/115)
* correct GET DIRECT DATA with mapped dim by directly comparing indices ([#146](https://github.com/climateinteractive/SDEverywhere/issues/146)) ([fa2097b](https://github.com/climateinteractive/SDEverywhere/commit/fa2097b4b7a0e1ae6580334f93936f70fde19a36)), closes [#145](https://github.com/climateinteractive/SDEverywhere/issues/145)
* correct initialization of 2D arrays to allow dimensions with matching subscript names ([#101](https://github.com/climateinteractive/SDEverywhere/issues/101)) ([2ed7e42](https://github.com/climateinteractive/SDEverywhere/commit/2ed7e427d6af956a9c6b9c03ef38845700cb3ff3)), closes [#84](https://github.com/climateinteractive/SDEverywhere/issues/84)
* emit any expression for the offset arg of VECTOR ELM MAP ([#129](https://github.com/climateinteractive/SDEverywhere/issues/129)) ([bd0a724](https://github.com/climateinteractive/SDEverywhere/commit/bd0a724462aaab09e205294b98cb450180f619c9)), closes [#128](https://github.com/climateinteractive/SDEverywhere/issues/128)
* exclude data vars from initLevels ([#127](https://github.com/climateinteractive/SDEverywhere/issues/127)) ([93a49cf](https://github.com/climateinteractive/SDEverywhere/commit/93a49cf1e7562987a9836dab580a6fad4428d25d)), closes [#126](https://github.com/climateinteractive/SDEverywhere/issues/126)
* expand references to vars with any number of separated dimensions ([#112](https://github.com/climateinteractive/SDEverywhere/issues/112)) ([0d0d40e](https://github.com/climateinteractive/SDEverywhere/commit/0d0d40e1b5b39560ae67f440172e5ded90a6cd3a)), closes [#111](https://github.com/climateinteractive/SDEverywhere/issues/111)
* expand variables allowing for any number of indices in EXCEPT clause ([#118](https://github.com/climateinteractive/SDEverywhere/issues/118)) ([d92343e](https://github.com/climateinteractive/SDEverywhere/commit/d92343e0806f228537f905956d053777accf9e97)), closes [#117](https://github.com/climateinteractive/SDEverywhere/issues/117)
* fix LOOKUP FORWARD to correctly handle fractional inputs ([#38](https://github.com/climateinteractive/SDEverywhere/issues/38)) ([c1f9580](https://github.com/climateinteractive/SDEverywhere/commit/c1f95804533b70036b14fa1caee64d402aeacfeb)), closes [#36](https://github.com/climateinteractive/SDEverywhere/issues/36)
* generate correct references for the ALLOCATE AVAILABLE priority profile ([#136](https://github.com/climateinteractive/SDEverywhere/issues/136)) ([b1d8ae2](https://github.com/climateinteractive/SDEverywhere/commit/b1d8ae2c19b4717df49a4a3e001625ce9568a3ac)), closes [#135](https://github.com/climateinteractive/SDEverywhere/issues/135)
* get direct data offset from the separated dimension ([#114](https://github.com/climateinteractive/SDEverywhere/issues/114)) ([ebbaa01](https://github.com/climateinteractive/SDEverywhere/commit/ebbaa0161dd0d5272f43f5323c0658413d21da47)), closes [#113](https://github.com/climateinteractive/SDEverywhere/issues/113)
* handle subdimensions correctly for GET DIRECT CONSTANTS and fix EXCEPT handling ([#125](https://github.com/climateinteractive/SDEverywhere/issues/125)) ([2fdfb34](https://github.com/climateinteractive/SDEverywhere/commit/2fdfb343dad047b1583a321ed174fa8813107a6c)), closes [#124](https://github.com/climateinteractive/SDEverywhere/issues/124) [#134](https://github.com/climateinteractive/SDEverywhere/issues/134)
* handle subscripts correctly when nested in expr within array function call ([#48](https://github.com/climateinteractive/SDEverywhere/issues/48)) ([b2458ab](https://github.com/climateinteractive/SDEverywhere/commit/b2458ab7e764b4ec33bebf1ee9ac3a80de9b474b)), closes [#46](https://github.com/climateinteractive/SDEverywhere/issues/46)
* make `sde log` wait for DAT file to be fully written and improve error handling ([#123](https://github.com/climateinteractive/SDEverywhere/issues/123)) ([34f25f8](https://github.com/climateinteractive/SDEverywhere/commit/34f25f8b97a8f8d2d0c949b6b81ca655a5e048d1)), closes [#122](https://github.com/climateinteractive/SDEverywhere/issues/122)
* make browserify an optional dependency ([#53](https://github.com/climateinteractive/SDEverywhere/issues/53)) ([e9bbbc6](https://github.com/climateinteractive/SDEverywhere/commit/e9bbbc66dcb59d629b6053a51faeee83a347147d)), closes [#52](https://github.com/climateinteractive/SDEverywhere/issues/52)
* make flatten command work when equations don't include continuation backslash ([#173](https://github.com/climateinteractive/SDEverywhere/issues/173)) ([ac7c027](https://github.com/climateinteractive/SDEverywhere/commit/ac7c0277c3676f09222f4c36fc2abb23894fad26))
* prevent memory leaks in fixed delay initialization ([#160](https://github.com/climateinteractive/SDEverywhere/issues/160)) ([e158b2f](https://github.com/climateinteractive/SDEverywhere/commit/e158b2f3abe0a1419fb3211fc5952e60b1daaac0)), closes [#159](https://github.com/climateinteractive/SDEverywhere/issues/159)
* record variants of a subscripted variable in removeUnusedVariables ([#65](https://github.com/climateinteractive/SDEverywhere/issues/65)) ([f6d7035](https://github.com/climateinteractive/SDEverywhere/commit/f6d70356f814d3936a5e8c13296088ea241a268c)), closes [#64](https://github.com/climateinteractive/SDEverywhere/issues/64)
* refine the ALLOCATE AVAILABLE search algorithm ([#141](https://github.com/climateinteractive/SDEverywhere/issues/141)) ([bca43a0](https://github.com/climateinteractive/SDEverywhere/commit/bca43a049f666289a2c536cc4174718d43efa4d3)), closes [#139](https://github.com/climateinteractive/SDEverywhere/issues/139)
* remove fcmp library and rewrite expressions without using its macros ([#131](https://github.com/climateinteractive/SDEverywhere/issues/131)) ([df76872](https://github.com/climateinteractive/SDEverywhere/commit/df768724c36ded22677ecdf54c0a3019f9cbab8f)), closes [#107](https://github.com/climateinteractive/SDEverywhere/issues/107)
* remove unnecessary memcpy loop in lookup data initialization ([#166](https://github.com/climateinteractive/SDEverywhere/issues/166)) ([b94d9c4](https://github.com/climateinteractive/SDEverywhere/commit/b94d9c4c2c14a08440fc2f769a6e08e33a165f2a)), closes [#165](https://github.com/climateinteractive/SDEverywhere/issues/165)
* set model directory in the sde causes command ([#142](https://github.com/climateinteractive/SDEverywhere/issues/142)) ([44d326e](https://github.com/climateinteractive/SDEverywhere/commit/44d326e3d684f25ad76d9bca3ca7bd2bb7379768)), closes [#140](https://github.com/climateinteractive/SDEverywhere/issues/140)
* take DELAY FIXED value from input when delay time = 0 ([#148](https://github.com/climateinteractive/SDEverywhere/issues/148)) ([328d050](https://github.com/climateinteractive/SDEverywhere/commit/328d05097aa741c09f8be057eed18c05350ce486)), closes [#147](https://github.com/climateinteractive/SDEverywhere/issues/147)
* terminate generated equations with ~~| ([#120](https://github.com/climateinteractive/SDEverywhere/issues/120)) ([44d1c2a](https://github.com/climateinteractive/SDEverywhere/commit/44d1c2a5fe36e11c57ac9828959f77303819c90e)), closes [#119](https://github.com/climateinteractive/SDEverywhere/issues/119)
* use a global replace to join multiple line Vensim equations in comments ([#175](https://github.com/climateinteractive/SDEverywhere/issues/175)) ([678f2bb](https://github.com/climateinteractive/SDEverywhere/commit/678f2bb4aa8f0a1bd5fdbe8e05c355bc4db5d517))
* use case-insensitive sort and remove trailing whitespace in preprocessor ([#57](https://github.com/climateinteractive/SDEverywhere/issues/57)) ([d58390a](https://github.com/climateinteractive/SDEverywhere/commit/d58390ae9754562b38e54aeb7917605aab54b894)), closes [#55](https://github.com/climateinteractive/SDEverywhere/issues/55)
* use chunkedFunction to break up initLookups into smaller functions ([#133](https://github.com/climateinteractive/SDEverywhere/issues/133)) ([bad4580](https://github.com/climateinteractive/SDEverywhere/commit/bad4580d6d98c8ea66082bbe984542ce84ba9164)), closes [#132](https://github.com/climateinteractive/SDEverywhere/issues/132)
* use correct subdimension index for delay aux vars ([#92](https://github.com/climateinteractive/SDEverywhere/issues/92)) ([7158b0f](https://github.com/climateinteractive/SDEverywhere/commit/7158b0fb45af1cfb9396d22010a41a3df7c917f4)), closes [#91](https://github.com/climateinteractive/SDEverywhere/issues/91)
* use subdim indices for GET DIRECT DATA ([#164](https://github.com/climateinteractive/SDEverywhere/issues/164)) ([d7b46c6](https://github.com/climateinteractive/SDEverywhere/commit/d7b46c6b0720b716d466b40ef975103338e5398c)), closes [#163](https://github.com/climateinteractive/SDEverywhere/issues/163)
* wrap conditional branch expression in parentheses when optimizing IF THEN ELSE ([#153](https://github.com/climateinteractive/SDEverywhere/issues/153)) ([bd42d54](https://github.com/climateinteractive/SDEverywhere/commit/bd42d540e6ef573ce7f713e429eaad61e87398ce)), closes [#152](https://github.com/climateinteractive/SDEverywhere/issues/152)


### Performance Improvements

* cache last input and last accessed index for faster lookups ([#43](https://github.com/climateinteractive/SDEverywhere/issues/43)) ([0933a89](https://github.com/climateinteractive/SDEverywhere/commit/0933a89819cf91000354f45459556fcb212312f3)), closes [#34](https://github.com/climateinteractive/SDEverywhere/issues/34)
* cache parsed CSV file data and replace Array with Set to improve code gen performance ([#168](https://github.com/climateinteractive/SDEverywhere/issues/168)) ([58a45ba](https://github.com/climateinteractive/SDEverywhere/commit/58a45bafda4ccec754b5e60f4fa0045d60b5dcab)), closes [#167](https://github.com/climateinteractive/SDEverywhere/issues/167)
* improve code gen performance by avoiding linear searches ([#63](https://github.com/climateinteractive/SDEverywhere/issues/63)) ([d4bf555](https://github.com/climateinteractive/SDEverywhere/commit/d4bf555bd8c568af8c837eccd135e79a490d5c0f)), closes [#62](https://github.com/climateinteractive/SDEverywhere/issues/62)
* optimize IF THEN ELSE for cases where condition expression resolves to a constant ([#103](https://github.com/climateinteractive/SDEverywhere/issues/103)) ([f9ef675](https://github.com/climateinteractive/SDEverywhere/commit/f9ef67539938ed949a17022df05707a2c06c558a)), closes [#102](https://github.com/climateinteractive/SDEverywhere/issues/102)
* remove variables that are not referenced by input or output variables ([#44](https://github.com/climateinteractive/SDEverywhere/issues/44)) ([6c80c59](https://github.com/climateinteractive/SDEverywhere/commit/6c80c5919d94b9d66c2df3d27f181989ac864000)), closes [#1](https://github.com/climateinteractive/SDEverywhere/issues/1)

## 0.5.3 (2020-07-29)

- improved performance of LOOKUP
- optimized dimension name references to avoid array accesses
- changed lookup initialization to use static arrays for improved Wasm performance
- replaced wrapper functions with C macros to reduce function call overhead
- split large functions reduce stack frame size (improves Wasm memory use and performance)

## 0.5.2 (2020-06-03)

- includes fixes that more fully automate conversion of complicated MDL model files
- moved tools to Python 3
- use the updated ANTLR-Version package
- improved support for two-dimensional arrays
- added handling of 2D constant arrays with subscripts in any order
- added support for dimension name references
- added support for ELMCOUNT
- added support for PULSE TRAIN
- updated documentation
- updated npm package dependencies

## 0.5.1 (2019-09-27)

- support multiple chartDatfiles delimited by semicolons in app.csv
- override generated app styles in an optional custom.css file in the config folder
- add optional varname prefix to readDat

## 0.5.0 (2019-07-24)

- web app generation uses simpler CSV configuration instead of YAML
- three-dimensional arrays
- :EXCEPT: subscripts
- two-dimensional const arrays
- GET DIRECT DATA for Excel at code generation time
- read output variables from DAT files to WITH LOOKUP variables
- generate variable documention in text and YAML formats
- allow all special characters in variable names
- improved coverage of subrange and mapping edge cases

## 0.4.1 (2018-03-11)

- enable a blank cell in the HTML input panel with an empty value in `sliders`
- add `sde causes` command to print model variable dependencies
- fixed HTML generation on Linux
- corrected instructions for building from the repo

## 0.4.0 (2018-02-05)

- updated web app generation to use an improved template
- added new app.yaml web app specification file
- generate complete web app with the `sde generate --genhtml` command
- removed the Vensim grammar to an independent package
- removed the lotka sample model
- added the SIR sample model
- optimized performance by making high-precision floating point comparisons optional
- added support for generating code to run the model interactively
- removed unnecessary glib2 dependency
- added a warning message when an input or output variable does not exist in the model
- fill in all ref ids for a generated variable that is expanded over a non-apply-to-all array
- implement Vensim data variables in DAT files with lookups
