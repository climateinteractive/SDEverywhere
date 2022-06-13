// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

/**
 * Return the cartesian product of the given array of arrays.
 *
 * For example, if we have an array that lists out two dimensions:
 *   [ ['a1','a2'], ['b1','b2','b3'] ]
 * this function will return all the combinations, e.g.:
 *   [ ['a1', 'b1'], ['a1', 'b2'], ['a1', 'b3'], ['a2', 'b1'], ... ]
 *
 * This can be used in place of nested for loops and has the benefit of working
 * for multi-dimensional inputs.
 */
export function cartesianProductOf<T>(arr: T[][]): T[][] {
  // Implementation based on: https://stackoverflow.com/a/36234242
  return arr.reduce(
    (a, b) => {
      return a.map(x => b.map(y => x.concat([y]))).reduce((v, w) => v.concat(w), [])
    },
    [[]]
  )
}
