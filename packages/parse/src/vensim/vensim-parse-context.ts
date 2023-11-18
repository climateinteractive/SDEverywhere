// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { SubName } from '../ast/ast-types'

/**
 * Context interface that provides access to file system resources (such as external
 * data files) that are referenced during the parse phase.
 */
export interface VensimParseContext {
  /**
   * TODO
   *
   * @param fileName
   * @param tabOrDelimiter
   * @param firstCell
   * @param lastCell
   * @param prefix
   */
  getDirectSubscripts(
    fileName: string,
    tabOrDelimiter: string,
    firstCell: string,
    lastCell: string,
    prefix: string
  ): SubName[]
}
