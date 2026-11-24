//
// This is a small `typedoc` plugin that removes the "Extends" and "Inherited from"
// (and related) sections when they refer to a type that is not itself part of the
// documented API.
//
// We use internal helper types (for example, to derive one interface from another
// without duplicating the property declarations), and those types are not exported.
// When an interface extends one of those, `typedoc` still emits sections naming the
// internal type, which is just noise for the reader (it is not even a link, since
// there is no page to link to).
//
// Note that inheritance from a type that _is_ documented is left alone, since in that
// case the sections are useful and link to the page for the declaring type.
//

import { Converter } from 'typedoc'

/**
 * Return true if the given reference points at a type that has a page in the
 * generated documentation.
 *
 * @param {*} reference The `ReferenceType` to check, or undefined.
 * @return {boolean} True if the reference resolves to a documented reflection.
 */
function isDocumented(reference) {
  return reference?.reflection !== undefined
}

/**
 * Register the plugin with the given `typedoc` application.
 *
 * @param {*} app The `typedoc` application.
 */
export function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE_END, context => {
    for (const reflection of Object.values(context.project.reflections)) {
      // Drop the per-member sections ("Inherited from", "Implementation of", "Overrides")
      for (const prop of ['inheritedFrom', 'implementationOf', 'overwrites']) {
        if (reflection[prop] && !isDocumented(reflection[prop])) {
          reflection[prop] = undefined
        }
      }

      // Drop the per-type sections ("Extends", "Implements", and their inverses)
      let hasDocumentedRelation = false
      for (const prop of ['extendedTypes', 'implementedTypes', 'extendedBy', 'implementedBy']) {
        const refs = reflection[prop]
        if (refs) {
          const documentedRefs = refs.filter(isDocumented)
          reflection[prop] = documentedRefs.length > 0 ? documentedRefs : undefined
          hasDocumentedRelation ||= documentedRefs.length > 0
        }
      }

      // The type hierarchy is derived from the properties above, but it is computed
      // before this runs, so it needs to be dropped here as well
      if (reflection.typeHierarchy && !hasDocumentedRelation) {
        reflection.typeHierarchy = undefined
      }
    }
  })
}
