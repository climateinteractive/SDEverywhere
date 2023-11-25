// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { ModelParser, ModelVisitor } from 'antlr4-vensim'

import { canonicalName, cFunctionName } from '../../_shared/names'

import { createAntlrParser } from './antlr-parser'

export class SubscriptRangeReader extends ModelVisitor {
  /**
   * @public
   * @param {import('../vensim-parse-context').VensimParseContext} parseContext An object
   * that provides access to file system resources (such as external data files) that are
   * referenced during the parse phase.
   */
  constructor(parseContext /*: VensimParseContext*/) {
    super()
    this.parseContext = parseContext
  }

  /**
   * Parse the given Vensim subscript range definition and return a `DimensionDef` AST node.
   *
   * @public
   * @param {string} subscriptRangeText A string containing the Vensim subscript range definition.
   * @returns {import('../../ast/ast-types').DimensionDef} A `DimensionDef` AST node.
   */
  /*public*/ parse(subscriptRangeText /*: string*/) /*: DimensionDef*/ {
    const parser = createAntlrParser(subscriptRangeText)
    const subscriptRangeCtx = parser.subscriptRange()
    return this.visitSubscriptRange(subscriptRangeCtx)
  }

  /**
   * Process the given ANTLR `SubscriptRangeContext` from an already parsed Vensim
   * subscript range definition.
   *
   * @public
   * @param {import('antlr4-vensim').SubscriptRangeContext} ctx The ANTLR `SubscriptRangeContext`.
   * @returns {import('../../ast/ast-types').Expr} A `SubscriptRange` AST node.
   */
  /*public*/ visitSubscriptRange(ctx /*: SubscriptRangeContext*/) /*: DimensionDef*/ {
    this.subscriptNames = []
    this.subscriptMappings = []

    // TODO: For now, fill in an empty string for the comment; this is mainly
    // for compatibility with unit tests that expect empty string instead of
    // undefined, but this should be revisited
    const comment = ''

    // A subscript alias has two identifiers, while a regular subscript range definition
    // has just one
    const ids = ctx.Id()
    if (ids.length === 1) {
      // This is a regular subscript range definition, which begins with the dimension name
      const dimName = ids[0].getText()
      const dimId = canonicalName(dimName)

      // Visit children to fill in the subscript range definition
      super.visitSubscriptRange(ctx)

      // Create a new subscript range definition (`DimensionDef`) from Vensim-format names.
      //   - The family is provisionally set to the dimension name.
      //   - It will be updated to the maximal dimension if this is a subdimension.
      //   - The mapping value contains dimensions and indices in the toDim.
      //   - It will be expanded and inverted to fromDim indices later.
      return {
        dimName,
        dimId,
        familyName: dimName,
        familyId: dimId,
        subscriptRefs: this.subscriptNames.map(subName => {
          return {
            subName,
            subId: canonicalName(subName)
          }
        }),
        subscriptMappings: this.subscriptMappings,
        comment
      }
    } else if (ids.length === 2) {
      // This is a dimension alias (`DimA <-> DimB`)
      const dimName = ids[0].getText()
      const dimId = canonicalName(dimName)
      const familyName = ids[1].getText()
      const familyId = canonicalName(familyName)
      return {
        dimName,
        dimId,
        familyName,
        familyId,
        subscriptRefs: [],
        subscriptMappings: [],
        comment
      }
    }
  }

  visitSubscriptDefList(ctx) {
    // A subscript def is either an `Id` (a single subscript name, like "A1") or a numeric range
    // like "(A1-A3)".  Either form can appear in the list, for example, "A1, (A5-A7), A9".
    for (const subscriptDef of ctx.children) {
      if (subscriptDef.symbol?.type === ModelParser.Id) {
        this.subscriptNames.push(subscriptDef.getText())
      } else if (subscriptDef.ruleIndex === ModelParser.RULE_subscriptSequence) {
        this.visitSubscriptSequence(subscriptDef)
      }
    }
  }

  visitSubscriptSequence(ctx) {
    // This is a subscript sequence (aka numeric range), like "(A1-A3)".
    // Construct index names from the sequence start and end indices.
    // This assumes the indices begin with the same string and end with numbers.
    const re = /^(.*?)(\d+)$/
    const ids = ctx.Id().map(id => id.getText())
    const matches = ids.map(id => re.exec(id))
    if (matches[0][1] === matches[1][1]) {
      const prefix = matches[0][1]
      const start = parseInt(matches[0][2])
      const end = parseInt(matches[1][2])
      for (let i = start; i <= end; i++) {
        this.subscriptNames.push(prefix + i)
      }
    }
  }

  visitSubscriptMapping(ctx) {
    // Get the name of the "to" part of the mapping
    const toDimName = ctx.Id().getText()

    // If a subscript list is part of the mapping, the names will be set by `visitSubscriptList`
    this.mappedSubscriptNames = []

    // Visit the rest of the mapping, which includes the subscript list portion
    super.visitSubscriptMapping(ctx)

    // Add the mappings
    this.subscriptMappings.push({
      toDimName,
      toDimId: canonicalName(toDimName),
      subscriptRefs: this.mappedSubscriptNames.map(subName => {
        return {
          subName,
          subId: canonicalName(subName)
        }
      })
    })
  }

  visitSubscriptList(ctx) {
    // When parsing subscript range definitions, a subscript list is only used in the context
    // of a subscript mapping.  It contains a list of subscript index names.
    this.mappedSubscriptNames = ctx.Id().map(id => id.getText())
  }

  visitCall(ctx) {
    // A subscript range can have a `GET DIRECT SUBSCRIPT` call on the RHS
    const fnName = ctx.Id().getText()
    const fnId = cFunctionName(fnName)
    if (fnId === '_GET_DIRECT_SUBSCRIPT') {
      super.visitCall(ctx)
    } else {
      throw new Error(
        `Only 'GET DIRECT SUBSCRIPT' calls are supported in subscript range definitions, but saw '${fnName}'`
      )
    }
  }

  visitExprList(ctx) {
    // The only call that ends up here is `GET DIRECT SUBSCRIPT`.  The arguments
    // are all strings that are delimited with single quotes, so strip those before
    // passing the arguments to the `getDirectSubscripts` function.
    const args = ctx.expr().map(expr => {
      const exprText = expr.getText()
      return exprText.replaceAll("'", '')
    })

    // Delegate to the context
    const fileName = args[0]
    const tabOrDelimiter = args[1]
    const firstCell = args[2]
    const lastCell = args[3]
    const prefix = args[4]
    this.subscriptNames =
      this.parseContext?.getDirectSubscripts(fileName, tabOrDelimiter, firstCell, lastCell, prefix) || []
  }
}
