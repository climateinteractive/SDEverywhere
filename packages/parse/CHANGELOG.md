# Changelog

## [0.1.1](https://github.com/climateinteractive/SDEverywhere/compare/parse-v0.1.0...parse-v0.1.1) (2024-09-15)


### Bug Fixes

* update to latest antlr4-vensim with support for Unicode characters in variable names ([#533](https://github.com/climateinteractive/SDEverywhere/issues/533)) ([c921657](https://github.com/climateinteractive/SDEverywhere/commit/c921657e12b4b996ab64be84a7af20826ca8350d)), closes [#532](https://github.com/climateinteractive/SDEverywhere/issues/532)

## 0.1.0 (2023-12-11)


### Features

* add `parse` package ([#406](https://github.com/climateinteractive/SDEverywhere/issues/406)) ([044d135](https://github.com/climateinteractive/SDEverywhere/commit/044d13591613c5c2831c88cef400791b77b94640)), closes [#405](https://github.com/climateinteractive/SDEverywhere/issues/405)
* preserve Vensim group names during preprocessing and parsing ([#418](https://github.com/climateinteractive/SDEverywhere/issues/418)) ([e755be2](https://github.com/climateinteractive/SDEverywhere/commit/e755be210369c7bbb1ea543b9b38e5c1b29ecd15)), closes [#417](https://github.com/climateinteractive/SDEverywhere/issues/417)


### Bug Fixes

* add parentheses if needed when reduceConditionals optimization is applied ([#411](https://github.com/climateinteractive/SDEverywhere/issues/411)) ([9269098](https://github.com/climateinteractive/SDEverywhere/commit/926909866da0f668f0208ae9de07b446679cda7d)), closes [#410](https://github.com/climateinteractive/SDEverywhere/issues/410)
* change reduceConditionals to not resolve variable references outside of the condition expression ([#409](https://github.com/climateinteractive/SDEverywhere/issues/409)) ([62e1ab1](https://github.com/climateinteractive/SDEverywhere/commit/62e1ab1400d887aeccfab9ed406103483c66af95)), closes [#408](https://github.com/climateinteractive/SDEverywhere/issues/408)
* implement unary NOT case for reduceExpr ([#415](https://github.com/climateinteractive/SDEverywhere/issues/415)) ([ce66990](https://github.com/climateinteractive/SDEverywhere/commit/ce669901e84442721dff34768bab80f703fba80f)), closes [#414](https://github.com/climateinteractive/SDEverywhere/issues/414)
