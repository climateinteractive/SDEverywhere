// Copyright (c) 2026 Climate Interactive / New Venture Fund

/**
 * Normalize the given model spec so that the rest of the compile package only needs
 * to work with the preferred property names.
 *
 * Some `spec.json` properties have been renamed over time.  For each renamed property,
 * this copies the value from the deprecated property to the preferred one, unless the
 * preferred property is already defined (in which case the preferred one wins).  The
 * deprecated properties are left in place so that the spec object is unchanged from
 * the caller's point of view.
 *
 * Note that the given spec object is modified in place (and returned for convenience),
 * which is consistent with how the spec object is treated elsewhere in this package.
 * This function is idempotent, so it is safe to call it more than once on the same spec.
 *
 * @param {*} spec The model spec to normalize, or undefined.
 * @return The same spec object that was provided.
 */
export function normalizeModelSpec(spec) {
  if (spec === undefined) {
    return spec
  }

  // The `externalDatfiles` property was renamed to `datFiles`
  if (spec.datFiles === undefined && spec.externalDatfiles !== undefined) {
    spec.datFiles = spec.externalDatfiles
  }

  return spec
}
