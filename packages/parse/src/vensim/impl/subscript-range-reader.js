// Copyright (c) 2023 Climate Interactive / New Venture Fund

import antlr4 from 'antlr4'
import { ModelLexer, ModelParser, ModelVisitor } from 'antlr4-vensim'

import { canonicalName } from '../../_shared/names'

/**
 * Create a `ModelParser` for the given model text, which can be the
 * contents of an entire `mdl` file, or a portion of one (e.g., an
 * expression or definition).
 *
 * @param input The string containing the model text.
 * @return A `ModelParser` from which a parse tree can be obtained.
 */
function createParser(input /*: string*/) /*: ModelParser*/ {
  const chars = new antlr4.InputStream(input)
  const lexer = new ModelLexer(chars)
  const tokens = new antlr4.CommonTokenStream(lexer)
  const parser = new ModelParser(tokens)
  parser.buildParseTrees = true
  return parser
}

export class SubscriptRangeReader extends ModelVisitor {
  constructor() {
    super()
  }

  /*public*/ parse(subscriptRangeText /*: string*/) /*: SubscriptRange*/ {
    const parser = createParser(subscriptRangeText)
    const subscriptRangeCtx = parser.subscriptRange()
    return this.visitSubscriptRange(subscriptRangeCtx)
  }

  /*public*/ visitSubscriptRange(ctx /*: SubscriptRangeContext*/) /*: SubscriptRange*/ {
    this.subscriptNames = []
    this.subscriptMappings = []

    // A subscript alias has two identifiers, while a regular subscript range definition
    // has just one
    const ids = ctx.Id()
    if (ids.length === 1) {
      // This is a regular subscript range definition, which begins with the dimension name
      const dimName = ids[0].getText()
      const dimId = canonicalName(dimName)

      // Visit children to fill in the subscript range definition
      super.visitSubscriptRange(ctx)

      // Create a new subscript range definition from Vensim-format names.
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
        subscriptMappings: this.subscriptMappings
      }
    } else if (ids.length === 2) {
      // This is a subscript alias (`DimA <-> DimB`)
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
        subscriptMappings: []
      }
    }
  }

  visitSubscriptList(ctx) {
    // A subscript list can appear in either a subscript range or mapping
    const subscriptNames = ctx.Id().map(id => id.getText())
    if (ctx.parentCtx.ruleIndex === ModelParser.RULE_subscriptRange) {
      this.subscriptNames = subscriptNames
    } else if (ctx.parentCtx.ruleIndex === ModelParser.RULE_subscriptMapping) {
      this.mappedSubscriptNames = subscriptNames
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

  visitSubscriptSequence(ctx) {
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

  visitCall(/*ctx*/) {
    throw new Error('GET DIRECT SUBSCRIPT not yet implemented')
    // // A subscript range can have a GET DIRECT SUBSCRIPT call on the RHS.
    // let fn = cFunctionName(ctx.Id().getText())
    // if (fn === '_GET_DIRECT_SUBSCRIPT') {
    //   super.visitCall(ctx)
    // }
  }
  visitExprList(/*ctx*/) {
    throw new Error('GET DIRECT SUBSCRIPT not yet implemented')
    // // We assume the only call that ends up here is GET DIRECT SUBSCRIPT.
    // let args = R.map(
    //   arg => matchRegex(arg, /'(.*)'/),
    //   R.map(expr => expr.getText(), ctx.expr())
    // )
    // let pathname = args[0]
    // let delimiter = args[1]
    // let firstCell = args[2]
    // let lastCell = args[3]
    // // let prefix = args[4]
    // // If lastCell is a column letter, scan the column, else scan the row.
    // let dataAddress = XLSX.utils.decode_cell(firstCell)
    // let col = dataAddress.c
    // let row = dataAddress.r
    // let nextCell
    // if (isNaN(parseInt(lastCell))) {
    //   nextCell = () => row++
    // } else {
    //   nextCell = () => col++
    // }
    // // Read subscript names from the CSV file at the given position.
    // let csvPathname = path.resolve(this.modelDirname, pathname)
    // let data = readCsv(csvPathname, delimiter)
    // if (data) {
    //   let indexName = data[row][col]
    //   while (indexName != null) {
    //     this.indNames.push(indexName)
    //     nextCell()
    //     indexName = data[row] != null ? data[row][col] : null
    //   }
    // }
    // super.visitExprList(ctx)
  }
}
