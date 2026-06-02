// Copyright (c) 2026 Climate Interactive / New Venture Fund

/**
 * Minimal xlsx reader and cell-address utilities used by the `GET DIRECT ...`
 * code paths in the compile pipeline. We read numeric cell values only; strings,
 * dates, and formula source text are surfaced where present but are not the
 * focus of this module.
 */

const A_UPPER = 65 // 'A'
const A_LOWER = 97 // 'a'

/**
 * Decode an A1-style cell ref to a zero-indexed `{c, r}`.
 *
 * Returns `{c: -1, r: -1}` for invalid input, matching the behavior of
 * `XLSX.utils.decode_cell` from SheetJS.
 *
 * @param {string} ref The cell reference (e.g. 'A1', 'AZ100').
 * @returns The zero-indexed column and row.
 */
export function decodeCell(ref) {
  let c = 0
  let i = 0
  const len = ref.length
  while (i < len) {
    const code = ref.charCodeAt(i)
    if (code >= 65 && code <= 90) {
      c = c * 26 + (code - A_UPPER + 1)
    } else if (code >= 97 && code <= 122) {
      c = c * 26 + (code - A_LOWER + 1)
    } else {
      break
    }
    i++
  }
  if (i === 0) return { c: -1, r: -1 }
  const r = parseInt(ref.slice(i), 10)
  if (!Number.isFinite(r) || r < 1) return { c: -1, r: -1 }
  return { c: c - 1, r: r - 1 }
}

/**
 * Encode a zero-indexed `{c, r}` to an A1-style cell ref.
 *
 * @param {{c: number, r: number}} addr The zero-indexed column and row.
 * @returns The A1-style cell reference (e.g. 'B7').
 */
export function encodeCell({ c, r }) {
  let col = ''
  let n = c + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    col = String.fromCharCode(A_UPPER + rem) + col
    n = Math.floor((n - 1) / 26)
  }
  return col + (r + 1)
}

/**
 * Decode a column ref (e.g. 'AB') to a zero-indexed column number.
 *
 * @param {string} ref The column reference.
 * @returns The zero-indexed column number, or -1 if the input is invalid.
 */
export function decodeCol(ref) {
  if (ref.length === 0) return -1
  let c = 0
  for (let i = 0; i < ref.length; i++) {
    const code = ref.charCodeAt(i)
    if (code >= 65 && code <= 90) c = c * 26 + (code - A_UPPER + 1)
    else if (code >= 97 && code <= 122) c = c * 26 + (code - A_LOWER + 1)
    else return -1
  }
  return c - 1
}

/**
 * Decode a row ref (e.g. '13') to a zero-indexed row number.
 *
 * @param {string} ref The row reference.
 * @returns The zero-indexed row number, or -1 if the input is invalid.
 */
export function decodeRow(ref) {
  const r = parseInt(ref, 10)
  return Number.isFinite(r) && r >= 1 ? r - 1 : -1
}
