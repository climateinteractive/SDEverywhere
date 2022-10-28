// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { CheckFunc } from './check-func'
import { checkFunc } from './check-func'
import type { CheckPredicateSpec } from './check-spec'

/**
 * Associates a check function instance with the metadata that describes the predicate.
 */
export interface CheckAction {
  predicateSpec: CheckPredicateSpec
  run: CheckFunc
}

/**
 * Return a `CheckAction` that runs a check according to the given predicate.
 *
 * @param predicateSpec The predicate spec.
 */
export function actionForPredicate(predicateSpec: CheckPredicateSpec): CheckAction {
  return {
    predicateSpec,
    run: checkFunc(predicateSpec)
  }
}
