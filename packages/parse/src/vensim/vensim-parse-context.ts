// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { SubName } from '../ast/ast-types'

/**
 * Context interface that provides access to file system resources (such as external
 * data files) that are needed when parsing a Vensim model.
 */
export interface VensimParseContext {
  /**
   * Called when a `GET DIRECT SUBSCRIPTS` function call is encountered when parsing a
   * Vensim subscript range definition.  The arguments are the same as those passed
   * to `GET DIRECT SUBSCRIPTS` in the model, except that the enclosing quotes have
   * already been removed.
   *
   * @param fileName The CSV or XLS[X] file path, or an indirect tag (e.g., '?data').
   * @param tabOrDelimiter The tab name (for XLS[X] files) or the delimiter (for CSV files).
   * @param firstCell The location of the first subscript element.
   * @param lastCell The location of the last subscript element.
   * @param prefix A string that is prepended to every subscript element.
   * @returns An array of subscript names read from the external data file.
   */
  getDirectSubscripts(
    fileName: string,
    tabOrDelimiter: string,
    firstCell: string,
    lastCell: string,
    prefix: string
  ): SubName[]
}
