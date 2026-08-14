import { indexNamesForSubscript } from '../_shared/subscript.js'

/**
 * Given the array of LHS subscript/dimension IDs (already mapped to correspond to the
 * RHS positions) and a set of RHS variable instances, return the refIds of the RHS
 * instances whose subscript combinations overlap with the LHS combinations at every
 * position.
 *
 * Conceptually, this is equivalent to checking whether any combination in the LHS
 * cartesian product matches any combination in a given RHS instance's cartesian
 * product.  But because positions in a cartesian product are independent, we only
 * need to check that each position has at least one index in common between the
 * LHS and RHS index sets.  This reduces the complexity of the check from
 * O(product of dimension sizes) to O(sum of dimension sizes).
 *
 * For example, suppose DimA={A1,A2} and DimB={B1,B2}, the LHS accesses `[DimA,DimB]`,
 * and we want to check whether it overlaps with a RHS variable instance `_x[_dima,_b1]`.
 * The full cartesian products look like this:
 *   LHS combos: { (A1,B1), (A1,B2), (A2,B1), (A2,B2) }
 *   RHS combos: { (A1,B1), (A2,B1) }
 * The two sets share (A1,B1) and (A2,B1), so there is a match.  But we don't need
 * to enumerate either set — we can check each position independently:
 *   position 0:  LHS {A1,A2} ∩ RHS {A1,A2} = {A1,A2}  (non-empty)
 *   position 1:  LHS {B1,B2} ∩ RHS {B1}    = {B1}     (non-empty)
 * Every position has at least one index in common, so we know a full-combo match
 * must exist (pick any shared index at each position, e.g., (A2,B1), and it is in
 * both products).  Conversely, if any position has an empty intersection, no full
 * combo can match — for example, if instead the LHS accessed `[A1,DimB]` (a specific
 * index at position 0) and the RHS instance were `_x[_a2,_dimb]`, position 0 would
 * give LHS {A1} ∩ RHS {A2} = ∅ and we could stop immediately.
 *
 * @param {string[]} mappedLhsSubIds The array of LHS subscript/dimension IDs at each
 * position, mapped to correspond to the RHS variable reference positions.
 * @param {{ subscripts: string[], refId: string }[]} rhsVarInstances The array of RHS
 * variable instances to filter.
 * @returns {string[]} A sorted array of refIds for the RHS instances whose subscripts
 * overlap with the LHS at every position.
 */
export function matchingRhsRefIds(mappedLhsSubIds, rhsVarInstances) {
  // Build a Set of LHS index names for each position for quick lookup
  const lhsIndexSets = mappedLhsSubIds.map(id => new Set(indexNamesForSubscript(id)))

  // For each RHS variable instance, check if there is overlap at every subscript
  // position between the LHS and RHS index sets
  const rhsRefIds = []
  for (const rhsVarInstance of rhsVarInstances) {
    let matches = true
    for (let i = 0; i < rhsVarInstance.subscripts.length; i++) {
      const rhsIndices = indexNamesForSubscript(rhsVarInstance.subscripts[i])
      let hasOverlap = false
      for (const id of rhsIndices) {
        if (lhsIndexSets[i].has(id)) {
          hasOverlap = true
          break
        }
      }
      if (!hasOverlap) {
        matches = false
        break
      }
    }
    if (matches) {
      rhsRefIds.push(rhsVarInstance.refId)
    }
  }

  // Return the sorted array of relevant refIds
  // TODO: Sorting is not essential here, but the legacy reader sorted so we will keep
  // that behavior now to avoid invalidating tests.  Later we should remove this `sort`
  // call and update the tests accordingly.
  return rhsRefIds.sort()
}
