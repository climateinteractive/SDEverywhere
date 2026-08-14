// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { isDimension, isIndex, sub } from '../_shared/subscript.js'

import Model from './model.js'

/**
 * Analyze the dependency cycle clusters reported by toposort and find variables that
 * could be separated into individual index instances to break the cycles.  A false
 * cycle can appear when a variable keeps a dimension for which the variables it
 * references are defined (or separated) element by element.  The whole-array variable
 * then depends on all elements of its references, merging the otherwise independent
 * dependency chains of each element into a single node.  Separating the variable on
 * that dimension restores the element-level dependency structure that Vensim uses
 * when it orders equations.
 *
 * Each cycle cluster is a strongly connected component of the dependency graph.
 * For each variable v in a cluster, propose separating v on a dimension D when a
 * successor of v in the cluster carries an individual index in the family of D and
 * a predecessor of v in the cluster references v by an individual element of D
 * (so that the separation actually removes the edge into the other elements of v).
 * If no candidate satisfies the predecessor condition, fall back to the candidates
 * that satisfy the successor condition alone.
 *
 * @param {Array} cycles The cycle clusters (strongly connected components), where each
 * cluster is an array of the ref IDs of the variables that it contains.
 * @param {Map} outgoingEdges A map of each ref ID to the set of ref IDs that it depends on.
 * @returns {Map} A map from variable name to the set of dimension IDs to separate on.
 */
export function separationCandidatesForCycles(cycles, outgoingEdges) {
  const candidates = new Map()
  const looseCandidates = new Map()
  const addCandidate = (map, varName, dimId) => {
    let dimIds = map.get(varName)
    if (!dimIds) {
      dimIds = new Set()
      map.set(varName, dimIds)
    }
    dimIds.add(dimId)
  }
  // The set of (variable name, family) pairs accepted as candidates so far; a variable
  // that will be separated on a family satisfies the predecessor condition for the
  // variables it references, so acceptance is iterated to a fixpoint below
  const acceptedFamilies = new Set()
  for (const scc of cycles) {
    const inScc = new Set(scc)
    // Build a predecessor map for the nodes in this cluster
    const predsOf = new Map(scc.map(refId => [refId, []]))
    for (const refId of scc) {
      for (const succ of outgoingEdges.get(refId) || []) {
        if (inScc.has(succ)) {
          predsOf.get(succ).push(refId)
        }
      }
    }
    // Collect the possible (v, D) pairs for this cluster
    const sccLooseCandidates = []
    for (const refId of scc) {
      const v = Model.varWithRefId(refId)
      if (!v || !v.subscripts || v.subscripts.length === 0) {
        continue
      }
      // Find the families of the individual indices carried by the successors
      // of this node within the cluster
      const succIndexFamilies = new Set()
      for (const succ of outgoingEdges.get(refId) || []) {
        if (inScc.has(succ)) {
          for (const subId of Model.splitRefId(succ).subscripts) {
            if (isIndex(subId)) {
              succIndexFamilies.add(sub(subId).family)
            }
          }
        }
      }
      for (const subId of v.subscripts) {
        if (isDimension(subId) && succIndexFamilies.has(sub(subId).family)) {
          // Skip the candidate when every predecessor references this variable
          // exclusively through a marked full dimension (e.g., `SUM(x[DimA!])`):
          // such references span all elements regardless of separation, so
          // separating this variable can never narrow the incoming edges
          const familyId = sub(subId).family
          const possiblyNarrowing = predsOf.get(refId).some(predRefId => {
            const pv = Model.varWithRefId(predRefId)
            if (!pv) {
              return false
            }
            const refKinds = elementRefKinds(pv, v.varName, familyId)
            return refKinds.elementRef || refKinds.fullDimRef || !refKinds.markedFullDimRef
          })
          if (possiblyNarrowing) {
            sccLooseCandidates.push({ refId, v, dimId: subId })
          }
        }
      }
    }
    // Accept the candidates that satisfy the predecessor condition, iterating to a
    // fixpoint since accepting one variable can qualify the variables it references
    const sccAccepted = new Set()
    let changed
    do {
      changed = false
      for (const c of sccLooseCandidates) {
        if (sccAccepted.has(c)) {
          continue
        }
        const familyId = sub(c.dimId).family
        const predQualifies = predRefId => {
          const pv = Model.varWithRefId(predRefId)
          if (!pv) {
            return false
          }
          const refKinds = elementRefKinds(pv, c.v.varName, familyId)
          if (refKinds.markedFullDimRef) {
            // The predecessor operates on all elements in the family (e.g., in a
            // `SUM` expression), so separating this variable does not narrow the edge
            return false
          }
          if (refKinds.elementRef) {
            // The predecessor references this variable by an individual element
            // (or through a subdimension, which Vensim maps element by element)
            return true
          }
          if (refKinds.fullDimRef) {
            // The predecessor references this variable through the full dimension;
            // that reference narrows to an element when the predecessor itself is
            // (or will be) separated on the same family
            if (pv.subscripts?.some(s => isIndex(s) && sub(s).family === familyId)) {
              return true
            }
            return acceptedFamilies.has(`${pv.varName}|${familyId}`)
          }
          return false
        }
        if (predsOf.get(c.refId).some(predQualifies)) {
          sccAccepted.add(c)
          acceptedFamilies.add(`${c.v.varName}|${familyId}`)
          addCandidate(candidates, c.v.varName, c.dimId)
          changed = true
        }
      }
    } while (changed)
    if (sccAccepted.size === 0) {
      // No candidate in this cluster satisfied the predecessor condition, so fall
      // back to the candidates that satisfied the successor condition alone
      for (const c of sccLooseCandidates) {
        addCandidate(looseCandidates, c.v.varName, c.dimId)
      }
    }
  }
  if (candidates.size > 0) {
    return candidates
  }
  return looseCandidates
}

/**
 * Examine how the given variable's parsed equation references the named variable
 * in subscript positions of the given family.
 *
 * @param {*} referencingVar The `Variable` instance whose equation is examined.
 * @param {string} varName The name (in canonical form) of the referenced variable.
 * @param {string} familyId The ID of the subscript family of interest.
 * @returns {object} An object with three flags:
 * - `elementRef` is set when a reference uses an individual index or a subdimension
 *   (Vensim maps subdimension references element by element, as in the common
 *   `x[current pass] = f(x[preceeding pass])` iteration idiom)
 * - `fullDimRef` is set when a reference uses the full dimension for the family
 * - `markedFullDimRef` is set when a reference uses the full dimension marked for
 *   vector operations (e.g., `SUM(x[DimA!])`), which always spans all elements
 */
function elementRefKinds(referencingVar, varName, familyId) {
  const kinds = { elementRef: false, fullDimRef: false, markedFullDimRef: false }
  const visit = node => {
    if (node === null || typeof node !== 'object') {
      return
    }
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    if (node.kind === 'variable-ref' && node.varId === varName && node.subscriptRefs) {
      for (const subRef of node.subscriptRefs) {
        // Remove the mark from a marked dimension (e.g., `_dima!`)
        const marked = subRef.subId.includes('!')
        const subId = subRef.subId.replace('!', '')
        const s = sub(subId)
        if (s?.family !== familyId) {
          continue
        }
        if (isIndex(subId) || s.size < sub(familyId).size) {
          kinds.elementRef = true
        } else if (marked) {
          kinds.markedFullDimRef = true
        } else {
          kinds.fullDimRef = true
        }
      }
    }
    for (const key of Object.keys(node)) {
      visit(node[key])
    }
  }
  const eqn = referencingVar.parsedEqn
  if (eqn?.rhs?.kind === 'expr') {
    visit(eqn.rhs.expr)
  }
  return kinds
}
