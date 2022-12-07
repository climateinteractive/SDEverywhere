import path from 'path'
import { ModelLexer, ModelParser } from 'antlr4-vensim'
import R from 'ramda'
import XLSX from 'xlsx'

import {
  canonicalName,
  cartesianProductOf,
  cdbl,
  cFunctionName,
  isArrayFunction,
  isDelayFunction,
  isSmoothFunction,
  isTrendFunction,
  isNpvFunction,
  listConcat,
  newTmpVarName,
  permutationsOf,
  readCsv,
  strToConst,
  vlog
} from '../_shared/helpers.js'
import {
  dimensionNames,
  extractMarkedDims,
  hasMapping,
  isDimension,
  isIndex,
  isTrivialDimension,
  indexInSepDim,
  normalizeSubscripts,
  separatedVariableIndex,
  sub
} from '../_shared/subscript.js'
import ModelReader from '../parse/model-reader.js'
import Model from '../model/model.js'

import LoopIndexVars from './loop-index-vars.js'
import ModelLHSReader from './model-lhs-reader.js'

export default class EquationGen extends ModelReader {
  constructor(variable, extData, directData, mode, modelDirname) {
    super()
    // the variable we are generating code for
    this.var = variable
    // external data map from DAT files
    this.extData = extData
    // direct data workbooks from Excel files
    this.directData = directData
    // set to 'decl', 'init-lookups', 'eval', etc depending on the section being generated
    this.mode = mode
    // The model directory is required when reading data files for GET DIRECT DATA.
    this.modelDirname = modelDirname
    // Maps of LHS subscript families to loop index vars for lookup on the RHS
    this.loopIndexVars = new LoopIndexVars(['i', 'j', 'k', 'l', 'm'])
    this.arrayIndexVars = new LoopIndexVars(['u', 'v', 'w', 's', 't', 'f', 'g', 'h', 'o', 'p', 'q', 'r'])
    // The LHS for array variables includes subscripts in normal form.
    this.lhs = this.var.varName + this.lhsSubscriptGen(this.var.subscripts)
    // formula expression channel
    this.exprCode = ''
    // comments channel
    this.comments = []
    // temporary variable channel
    this.tmpVarCode = []
    // subscript loop opening channel
    this.subscriptLoopOpeningCode = []
    // subscript loop closing channel
    this.subscriptLoopClosingCode = []
    // the name of the current array function (might differ from `currentFunctionName`
    // in the case where an expression is passed to an array function such as `SUM`)
    this.currentArrayFunctionName = ''
    // array function code buffer
    this.arrayFunctionCode = ''
    // the marked dimensions for an array function
    this.markedDims = []
    // stack of var names inside an expr
    this.varNames = []
    // components extracted from arguments to VECTOR ELM MAP
    this.vemVarName = ''
    this.vemSubscripts = []
    this.vemIndexDim = ''
    this.vemIndexBase = 0
    this.vemOffset = ''
    // components extracted from arguments to VECTOR SORT ORDER
    this.vsoVarName = ''
    this.vsoOrder = ''
    this.vsoTmpName = ''
    this.vsoTmpDimName = ''
    // components extracted from arguments to VECTOR SELECT
    this.vsSelectionArray = ''
    this.vsNullValue = ''
    this.vsAction = 0
    this.vsError = ''
    // components extracted from arguments to ALLOCATE AVAILABLE
    this.aaRequestArray = ''
    this.aaPriorityArray = ''
    this.aaAvailableResource = ''
    this.aaTmpName = ''
    this.aaTmpDimName = ''
  }
  generate() {
    // Generate code for the variable in either init or eval mode.
    if (this.var.isData()) {
      // If the data var was converted from a const, it will have lookup points.
      // Otherwise, read a data file to get lookup data.
      if (R.isEmpty(this.var.points)) {
        if (this.var.directDataArgs) {
          return this.generateDirectDataInit()
        } else {
          return this.generateExternalDataInit()
        }
      } else if (this.mode === 'decl') {
        return
      }
    }
    if (this.var.isLookup()) {
      return this.generateLookup()
    }
    // Show the model var as a comment for reference.
    this.comments.push(`  // ${this.var.modelLHS} = ${this.var.modelFormula.replace(/\n/g, '')}`)
    // Emit direct constants individually without separating them first.
    if (this.var.directConstArgs) {
      return this.generateDirectConstInit()
    }
    // Initialize array variables with dimensions in a loop for each dimension.
    let dimNames = dimensionNames(this.var.subscripts)
    // Turn each dimension name into a loop with a loop index variable.
    // If the variable has no subscripts, nothing will be emitted here.
    this.subscriptLoopOpeningCode = R.concat(
      this.subscriptLoopOpeningCode,
      R.map(dimName => {
        let i = this.loopIndexVars.index(dimName)
        return `  for (size_t ${i} = 0; ${i} < ${sub(dimName).size}; ${i}++) {`
      }, dimNames)
    )
    // Walk the parse tree to generate code into all channels.
    // Use this to examine code generation for a particular variable.
    // if (this.var.refId === '') {
    //   debugger
    // }
    this.visitEquation(this.var.eqnCtx)
    // Either emit constant list code or a regular var assignment.
    let formula = `  ${this.lhs} = ${this.exprCode};`
    // Close the assignment loops.
    this.subscriptLoopClosingCode = R.concat(
      this.subscriptLoopClosingCode,
      R.map(() => `  }`, dimNames)
    )
    // Assemble code from each channel into final var code output.
    return this.comments.concat(this.subscriptLoopOpeningCode, this.tmpVarCode, formula, this.subscriptLoopClosingCode)
  }
  //
  // Helpers
  //
  currentVarName() {
    let n = this.varNames.length
    return n > 0 ? this.varNames[n - 1] : undefined
  }
  lookupName() {
    // Convert a call name into a lookup name.
    return canonicalName(this.currentFunctionName()).slice(1)
  }
  emit(text) {
    if (this.currentArrayFunctionName) {
      // Emit code to the array function code buffer if we are in an array function.
      this.arrayFunctionCode += text
    } else if (this.argIndexForFunctionName('_VECTOR_ELM_MAP') === 1) {
      // Emit expression code in the second argument of VECTOR ELM MAP to vemOffset.
      this.vemOffset += text
    } else {
      // Otherwise emit code to the expression code channel.
      this.exprCode += text
    }
  }
  cVarOrConst(expr) {
    // Get either a constant or a var name in C format from a parse tree expression.
    let value = expr.getText().trim()
    if (value === ':NA:') {
      return '_NA_'
    } else {
      let v = Model.varWithName(canonicalName(value))
      if (v) {
        return v.varName
      } else {
        let d = parseFloat(value)
        if (Number.isNaN(d)) {
          d = 0
        }
        return cdbl(d)
      }
    }
  }
  constValue(c) {
    // Get a numeric value from a constant var name in model form.
    // Return 0 if the value is not a numeric string or const variable.
    let value = parseFloat(c)
    if (!Number.isNaN(value)) {
      return value
    }
    // Look up the value as a symbol name and return the const value.
    value = 0
    let v = Model.varWithName(canonicalName(c))
    if (v && v.isConst()) {
      value = parseFloat(v.modelFormula)
      if (Number.isNaN(value)) {
        value = 0
      }
    }
    return value
  }
  lookupDataNameGen(subscripts) {
    // Construct a name for the static data array associated with a lookup variable.
    return R.map(subscript => {
      if (isDimension(subscript)) {
        let i = this.loopIndexVars.index(subscript)
        if (isTrivialDimension(subscript)) {
          // When the dimension is trivial, we can simply emit e.g. `[i]` instead of `[_dim[i]]`
          return `_${i}_`
        } else {
          return `_${subscript}_${i}_`
        }
      } else {
        return `_${sub(subscript).value}_`
      }
    }, subscripts).join('')
  }
  lhsSubscriptGen(subscripts) {
    // Construct C array subscripts from subscript names in the variable's normal order.
    return R.map(subscript => {
      if (isDimension(subscript)) {
        let i = this.loopIndexVars.index(subscript)
        if (isTrivialDimension(subscript)) {
          // When the dimension is trivial, we can simply emit e.g. `[i]` instead of `[_dim[i]]`
          return `[${i}]`
        } else {
          return `[${subscript}[${i}]]`
        }
      } else {
        return `[${sub(subscript).value}]`
      }
    }, subscripts).join('')
  }
  rhsSubscriptGen(subscripts) {
    // Normalize RHS subscripts.
    try {
      subscripts = normalizeSubscripts(subscripts)
    } catch (e) {
      console.error('ERROR: normalizeSubscripts failed in rhsSubscriptGen')
      vlog('this.var.refId', this.var.refId)
      vlog('this.currentVarName()', this.currentVarName())
      vlog('subscripts', subscripts)
      throw e
    }
    // Get the loop index var name source.
    let cSubscripts = R.map(rhsSub => {
      if (isIndex(rhsSub)) {
        // Return the index number for an index subscript.
        return `[${sub(rhsSub).value}]`
      } else {
        // The subscript is a dimension.
        // Get the loop index variable, matching the previously emitted for loop variable.
        let i
        if (this.markedDims.includes(rhsSub)) {
          i = this.arrayIndexVars.index(rhsSub)
        } else {
          // Use the single index name for a separated variable if it exists.
          let separatedIndexName = separatedVariableIndex(rhsSub, this.var, subscripts)
          if (separatedIndexName) {
            return `[${sub(separatedIndexName).value}]`
          }
          // See if we need to apply a mapping because the RHS dim is not found on the LHS.
          let found = this.var.subscripts.findIndex(lhsSub => sub(lhsSub).family === sub(rhsSub).family)
          if (found < 0) {
            // Find the  mapping from the RHS subscript to a LHS subscript.
            for (let lhsSub of this.var.subscripts) {
              if (hasMapping(rhsSub, lhsSub)) {
                // console.error(`${this.var.refId} hasMapping ${rhsSub} → ${lhsSub}`);
                i = this.loopIndexVars.index(lhsSub)
                return `[__map${rhsSub}${lhsSub}[${i}]]`
              }
            }
          }
          // There is no mapping, so use the loop index for this dim family on the LHS.
          i = this.loopIndexVars.index(rhsSub)
        }
        // Return the dimension and loop index for a dimension subscript.
        if (isTrivialDimension(rhsSub)) {
          // When the dimension is trivial, we can simply emit e.g. `[i]` instead of `[_dim[i]]`
          return `[${i}]`
        } else {
          return `[${rhsSub}[${i}]]`
        }
      }
    }, subscripts).join('')
    return cSubscripts
  }
  vemSubscriptGen() {
    // VECTOR ELM MAP replaces one subscript with a calculated vemOffset from a base index.
    let subscripts = normalizeSubscripts(this.vemSubscripts)
    let cSubscripts = R.map(rhsSub => {
      if (isIndex(rhsSub)) {
        // Emit the index vemOffset from VECTOR ELM MAP for the index subscript.
        return `[${this.vemIndexDim}[(size_t)(${this.vemIndexBase} + ${this.vemOffset})]]`
      } else {
        let i = this.loopIndexVars.index(rhsSub)
        return `[${rhsSub}[${i}]]`
      }
    }, subscripts).join('')
    return cSubscripts
  }
  vsoSubscriptGen(subscripts) {
    // _VECTOR_SORT_ORDER will iterate over the last subscript in its first arg.
    let i = this.loopIndexVars.index(subscripts[0])
    if (subscripts.length > 1) {
      this.vsoVarName += `[${subscripts[0]}[${i}]]`
      i = this.loopIndexVars.index(subscripts[1])
      this.vsoTmpDimName = subscripts[1]
    } else {
      this.vsoTmpDimName = subscripts[0]
    }
    // Emit the tmp var subscript just after emitting the tmp var elsewhere.
    this.emit(`[${this.vsoTmpDimName}[${i}]]`)
  }
  aaSubscriptGen(subscripts) {
    // _ALLOCATE_AVAILABLE will iterate over the subscript in its first arg.
    let i = this.loopIndexVars.index(subscripts[0])
    this.aaTmpDimName = subscripts[0]
    // Emit the tmp var subscript just after emitting the tmp var elsewhere.
    this.emit(`[${this.aaTmpDimName}[${i}]]`)
  }
  functionIsLookup() {
    // See if the function name in the current call is actually a lookup.
    // console.error(`isLookup ${this.lookupName()}`);
    let v = Model.varWithName(this.lookupName())
    return v && v.isLookup()
  }
  generateLookup() {
    // Construct the name of the data array, which is based on the associated lookup var name,
    // with any subscripts tacked on the end.
    const dataName = this.var.varName + '_data_' + this.lookupDataNameGen(this.var.subscripts)
    if (this.mode === 'decl') {
      // In decl mode, declare a static data array that will be used to create the associated `Lookup`
      // at init time. Using static arrays is better for code size, helps us avoid creating a copy of
      // the data in memory, and seems to perform much better when compiled to wasm when compared to the
      // previous approach that used varargs + copying, especially on constrained (e.g. iOS) devices.
      let data = R.reduce((a, p) => listConcat(a, `${cdbl(p[0])}, ${cdbl(p[1])}`, true), '', this.var.points)
      return [`double ${dataName}[${this.var.points.length * 2}] = { ${data} };`]
    } else if (this.mode === 'init-lookups') {
      // In init mode, create the `Lookup`, passing in a pointer to the static data array declared earlier.
      // TODO: Make use of the lookup range
      if (this.var.points.length < 1) {
        throw new Error(`ERROR: lookup size = ${this.var.points.length} in ${this.lhs}`)
      }
      return [`  ${this.lhs} = __new_lookup(${this.var.points.length}, /*copy=*/false, ${dataName});`]
    } else {
      return []
    }
  }
  generateDirectDataInit() {
    // If direct data exists for this variable, copy it from the workbook into one or more lookups.
    let result = []
    if (this.mode === 'init-lookups') {
      let getCellValue
      let { file, tab, timeRowOrCol, startCell } = this.var.directDataArgs
      if (file.startsWith('?')) {
        // The file is a tag for an Excel file with data in the directData map.
        let workbook = this.directData.get(file)
        if (workbook) {
          let sheet = workbook.Sheets[tab]
          if (sheet) {
            getCellValue = (c, r) => {
              let cell = sheet[XLSX.utils.encode_cell({ c, r })]
              return cell != null ? cdbl(cell.v) : null
            }
          } else {
            throw new Error(`ERROR: Direct data worksheet ${tab} tagged ${file} not found`)
          }
        } else {
          throw new Error(`ERROR: Direct data workbook tagged ${file} not found`)
        }
      } else {
        // The file is a CSV pathname. Read it now.
        let csvPathname = path.resolve(this.modelDirname, file)
        let data = readCsv(csvPathname, tab)
        if (data) {
          getCellValue = (c, r) => {
            let value = '0.0'
            try {
              value = data[r] != null && data[r][c] != null ? cdbl(data[r][c]) : null
            } catch (error) {
              console.error(`${error.message} in ${csvPathname}`)
            }
            return value
          }
        }
      }
      // If the data was found, convert it to a lookup.
      if (getCellValue) {
        let indexNum = 0
        if (!R.isEmpty(this.var.separationDims)) {
          // Generate a lookup for a separated index in the variable's dimension.
          if (this.var.separationDims.length > 1) {
            console.error(`WARNING: direct data variable ${this.var.varName} separated on more than one dimension`)
          }
          let dimName = this.var.separationDims[0]
          for (let subscript of this.var.subscripts) {
            if (sub(subscript).family === dimName) {
              // Use the index value in the subscript family when that is the separation dimension.
              indexNum = sub(subscript).value
              break
            }
            if (sub(dimName).value.includes(subscript)) {
              // Look up the index when the separation dimension is a subdimension.
              indexNum = sub(dimName).value.indexOf(subscript)
              break
            }
          }
        }
        result.push(this.generateDirectDataLookup(getCellValue, timeRowOrCol, startCell, indexNum))
      }
    }
    return result
  }
  generateDirectDataLookup(getCellValue, timeRowOrCol, startCell, indexNum) {
    // Read a row or column of data as (time, value) pairs from the worksheet.
    // The cell(c,r) function wraps data access by column and row.
    let dataCol, dataRow, dataValue, timeCol, timeRow, timeValue, nextCell
    let lookupData = ''
    let lookupSize = 0
    let dataAddress = XLSX.utils.decode_cell(startCell)
    dataCol = dataAddress.c
    dataRow = dataAddress.r
    if (isNaN(parseInt(timeRowOrCol))) {
      // Time values are in a column.
      timeCol = XLSX.utils.decode_col(timeRowOrCol)
      timeRow = dataRow
      dataCol += indexNum
      nextCell = () => {
        dataRow++
        timeRow++
      }
    } else {
      // Time values are in a row.
      timeCol = dataCol
      timeRow = XLSX.utils.decode_row(timeRowOrCol)
      dataRow += indexNum
      nextCell = () => {
        dataCol++
        timeCol++
      }
    }
    timeValue = getCellValue(timeCol, timeRow)
    dataValue = getCellValue(dataCol, dataRow)
    while (timeValue != null && dataValue != null) {
      lookupData = listConcat(lookupData, `${timeValue}, ${dataValue}`, true)
      lookupSize++
      nextCell()
      dataValue = getCellValue(dataCol, dataRow)
      timeValue = getCellValue(timeCol, timeRow)
    }
    if (lookupSize < 1) {
      throw new Error(`ERROR: lookup size = ${lookupSize} in ${this.lhs}`)
    }
    return [`  ${this.lhs} = __new_lookup(${lookupSize}, /*copy=*/true, (double[]){ ${lookupData} });`]
  }
  generateDirectConstInit() {
    // Map zero, one, or two subscripts on the LHS in model order to a table of numbers in a CSV file.
    // The subscripts may be indices to pick out a subset of the data.
    let result = this.comments
    let { file, tab, startCell } = this.var.directConstArgs
    let csvPathname = path.resolve(this.modelDirname, file)
    let data = readCsv(csvPathname, tab)
    if (data) {
      let getCellValue = (c, r) => {
        let value = '0.0'
        try {
          value = data[r] != null && data[r][c] != null ? cdbl(data[r][c]) : null
        } catch (error) {
          console.error(`${error.message} in ${csvPathname}`)
        }
        return value
      }
      // Get C subscripts in text form for the LHS in normal order.
      let modelLHSReader = new ModelLHSReader()
      modelLHSReader.read(this.var.modelLHS)
      let modelDimNames = modelLHSReader.modelSubscripts.filter(s => isDimension(s))
      // Generate offsets from the start cell in the table corresponding to LHS indices.
      let cellOffsets = []
      let cSubscripts = this.var.subscripts.map(s => (isDimension(s) ? sub(s).value : [s]))
      let lhsIndexSubscripts = cartesianProductOf(cSubscripts)
      // Find the table cell offset for each LHS index tuple.
      for (let indexSubscripts of lhsIndexSubscripts) {
        let entry = [null, null]
        for (let i = 0; i < this.var.subscripts.length; i++) {
          // LHS dimensions or indices in a separated dimension map to table cells.
          let lhsSubscript = this.var.subscripts[i]
          if (isDimension(lhsSubscript) || indexInSepDim(lhsSubscript, this.var)) {
            // Consider the LHS index subscript at this position.
            let indexSubscript = indexSubscripts[i]
            let ind = sub(indexSubscript)
            // Find the model subscript position corresponding to the LHS index subscript.
            for (let iModelDim = 0; iModelDim < modelDimNames.length; iModelDim++) {
              // Only fill an entry position once.
              if (entry[iModelDim] === null) {
                let modelDim = sub(modelDimNames[iModelDim])
                if (modelDim.family === ind.family) {
                  // Set the numeric index for the model dimension in the cell offset entry.
                  // Use the position within the dimension to map subdimensions onto cell offsets.
                  let pos = modelDim.value.indexOf(indexSubscript)
                  // Vectors use a 2D cell offset that maps to columns in the first row.
                  // Tables use a 2D cell offset with the row or column matching the model dimension.
                  let entryRowOrCol = modelDimNames.length > 1 ? iModelDim : 1
                  entry[entryRowOrCol] = pos
                  break
                }
              }
            }
          }
        }
        // Replace unfilled entry positions with zero.
        entry = entry.map(x => (x === null ? 0 : x))
        // Read values by column first when the start cell ends with an asterisk.
        // Ref: https://www.vensim.com/documentation/fn_get_direct_constants.html
        if (startCell.endsWith('*')) {
          entry.reverse()
        }
        cellOffsets.push(entry)
      }
      // Read CSV data into an indexed variable for each cell.
      let numericSubscripts = lhsIndexSubscripts.map(idx => idx.map(s => sub(s).value))
      let lhsSubscripts = numericSubscripts.map(s => s.reduce((a, v) => a.concat(`[${v}]`), ''))
      let dataAddress = XLSX.utils.decode_cell(startCell)
      let startCol = dataAddress.c
      let startRow = dataAddress.r
      for (let i = 0; i < cellOffsets.length; i++) {
        let rowOffset = cellOffsets[i][0] ? cellOffsets[i][0] : 0
        let colOffset = cellOffsets[i][1] ? cellOffsets[i][1] : 0
        let dataValue = getCellValue(startCol + colOffset, startRow + rowOffset)
        let lhs = `${this.var.varName}${lhsSubscripts[i] || ''}`
        result.push(`  ${lhs} = ${dataValue};`)
      }
    }
    return result
  }
  generateExternalDataInit() {
    // If there is external data for this variable, copy it from an external file to a lookup.
    // Just like in generateLookup(), we declare static arrays to hold the data points in the first pass
    // ("decl" mode), then initialize each `Lookup` using that data in the second pass ("init" mode).
    const mode = this.mode

    const newLookup = (name, lhs, data, subscriptIndexes) => {
      if (!data) {
        throw new Error(`ERROR: Data for ${name} not found in external data sources`)
      }

      const dataName = this.var.varName + '_data_' + R.map(i => `_${i}_`, subscriptIndexes).join('')
      if (mode === 'decl') {
        // In decl mode, declare a static data array that will be used to create the associated `Lookup`
        // at init time. See `generateLookup` for more details.
        const points = R.reduce(
          (a, p) => listConcat(a, `${cdbl(p[0])}, ${cdbl(p[1])}`, true),
          '',
          Array.from(data.entries())
        )
        return `double ${dataName}[${data.size * 2}] = { ${points} };`
      } else if (mode === 'init-lookups') {
        // In init mode, create the `Lookup`, passing in a pointer to the static data array declared in decl mode.
        if (data.size < 1) {
          throw new Error(`ERROR: lookup size = ${data.size} in ${lhs}`)
        }
        return `  ${lhs} = __new_lookup(${data.size}, /*copy=*/false, ${dataName});`
      } else {
        return undefined
      }
    }

    // There are three common cases that we handle:
    //  - variable has no subscripts (C variable _thing = _thing from dat file)
    //  - variable has subscript(s) (C variable with index _thing[0] = _thing[_subscript] from dat file)
    //  - variable has dimension(s) (C variable in for loop, _thing[i] = _thing[_subscript_i] from dat file)

    if (!this.var.subscripts || this.var.subscripts.length === 0) {
      // No subscripts
      const data = this.extData.get(this.var.varName)
      return [newLookup(this.var.varName, this.lhs, data, [])]
    }

    if (this.var.subscripts.length === 1 && !isDimension(this.var.subscripts[0])) {
      // There is exactly one subscript
      const subscript = this.var.subscripts[0]
      const nameInDat = `${this.var.varName}[${subscript}]`
      const data = this.extData.get(nameInDat)
      const subIndex = sub(subscript).value
      return [newLookup(nameInDat, this.lhs, data, [subIndex])]
    }

    if (!R.all(s => isDimension(s), this.var.subscripts)) {
      // We don't yet handle the case where there are more than one subscript or a mix of
      // subscripts and dimensions
      // TODO: Remove this restriction
      throw new Error(`ERROR: Data variable ${this.var.varName} has >= 2 subscripts; not yet handled`)
    }

    // At this point, we know that we have one or more dimensions; compute all combinations
    // of the dimensions that we will iterate over
    const result = []
    const allDims = R.map(s => sub(s).value, this.var.subscripts)
    const dimTuples = cartesianProductOf(allDims)
    for (const dims of dimTuples) {
      // Note: It appears that the dat file can have the subscripts in a different order
      // than what SDE uses when declaring the C array.  If we don't find data for one
      // order, we try the other possible permutations.
      const dimNamePermutations = permutationsOf(dims)
      let nameInDat, data
      for (const dimNames of dimNamePermutations) {
        nameInDat = `${this.var.varName}[${dimNames.join(',')}]`
        data = this.extData.get(nameInDat)
        if (data) {
          break
        }
      }
      if (!data) {
        // We currently treat this as a warning, not an error, since there can sometimes be
        // datasets that are a sparse matrix, i.e., data is not defined for certain dimensions.
        // For these cases, the lookup will not be initialized (the Lookup pointer will remain
        // NULL, and any calls to `LOOKUP` will return `:NA:`.
        if (mode === 'decl') {
          console.error(`WARNING: Data for ${nameInDat} not found in external data sources`)
        }
        continue
      }

      const subscriptIndexes = R.map(dim => sub(dim).value, dims)
      const varSubscripts = R.map(index => `[${index}]`, subscriptIndexes).join('')
      const lhs = `${this.var.varName}${varSubscripts}`
      const lookup = newLookup(nameInDat, lhs, data, subscriptIndexes)
      if (lookup) {
        result.push(lookup)
      }
    }
    return result
  }
  //
  // Visitor callbacks
  //
  visitEquation(ctx) {
    if (this.var.isData() && !R.isEmpty(this.var.points)) {
      if (this.mode === 'init-lookups') {
        // If the var already has lookup data points, use those instead of reading them from a file.
        if (this.var.points.length < 1) {
          throw new Error(`ERROR: lookup size = ${this.var.points.length} in ${this.var.refId}`)
        }
        let lookupData = R.reduce((a, p) => listConcat(a, `${cdbl(p[0])}, ${cdbl(p[1])}`, true), '', this.var.points)
        this.emit(`__new_lookup(${this.var.points.length}, /*copy=*/true, (double[]){ ${lookupData} });`)
      }
    } else {
      super.visitEquation(ctx)
    }
  }
  visitCall(ctx) {
    // Convert the function name from Vensim to C format and push it onto the function name stack.
    // This maintains the name of the current function as its arguments are visited.
    this.callStack.push({ fn: cFunctionName(ctx.Id().getText()) })
    let fn = this.currentFunctionName()
    // Do not emit the function calls in init mode, only the init expression.
    // Do emit function calls inside an init expression (with call stack length > 1).
    if (this.var.hasInitValue && this.mode.startsWith('init') && this.callStack.length <= 1) {
      super.visitCall(ctx)
      this.callStack.pop()
    } else if (fn === '_ELMCOUNT') {
      // Replace the function with the value of its argument, emitted in visitVar.
      super.visitCall(ctx)
      this.callStack.pop()
    } else if (isArrayFunction(fn)) {
      // Capture the name of this array function (e.g. `SUM`).  This should be used
      // to determine if a subscripted variable is used inside of an expression
      // passed to an array function, e.g.:
      //   SUM ( Variable[Dim] )
      // or
      //   SUM ( IF THEN ELSE ( Variable[Dim], ... ) )
      // In the first example, when `Variable` is evaluated, both `currentFunctionName`
      // and `currentArrayFunctionName` will be `SUM`.  But in the second case, when
      // `Variable` is evaluated, `currentFunctionName` will be `IF THEN ELSE` but
      // `currentArrayFunctionName` will be `SUM`.  A non-empty `currentArrayFunctionName`
      // is an indication that a loop needs to be generated.
      this.currentArrayFunctionName = fn
      // Generate a loop that evaluates array functions inline.
      // Collect information and generate the argument expression into the array function code buffer.
      super.visitCall(ctx)
      // Start a temporary variable to hold the result of the array function.
      let condVar
      let initValue = '0.0'
      if (fn === '_VECTOR_SELECT') {
        initValue = this.vsAction === 3 ? '-DBL_MAX' : '0.0'
        condVar = newTmpVarName()
        this.tmpVarCode.push(`  bool ${condVar} = false;`)
      } else if (fn === '_VMIN') {
        initValue = 'DBL_MAX'
      } else if (fn === '_VMAX') {
        initValue = '-DBL_MAX'
      }
      let tmpVar = newTmpVarName()
      this.tmpVarCode.push(`  double ${tmpVar} = ${initValue};`)
      // Emit the array function loop opening into the tmp var channel.
      for (let markedDim of this.markedDims) {
        let n
        try {
          n = sub(markedDim).size
        } catch (e) {
          console.error(`ERROR: marked dimension "${markedDim}" not found in var ${this.var.refId}`)
          throw e
        }
        let i = this.arrayIndexVars.index(markedDim)
        this.tmpVarCode.push(`	for (size_t ${i} = 0; ${i} < ${n}; ${i}++) {`)
      }
      // Emit the body of the array function loop.
      if (fn === '_VECTOR_SELECT') {
        this.tmpVarCode.push(`    if (bool_cond(${this.vsSelectionArray})) {`)
      }
      if (fn === '_SUM' || (fn === '_VECTOR_SELECT' && this.vsAction === 0)) {
        this.tmpVarCode.push(`	  ${tmpVar} += ${this.arrayFunctionCode};`)
      } else if (fn === '_VMIN') {
        this.tmpVarCode.push(`	  ${tmpVar} = fmin(${tmpVar}, ${this.arrayFunctionCode});`)
      } else if (fn === '_VMAX' || (fn === '_VECTOR_SELECT' && this.vsAction === 3)) {
        this.tmpVarCode.push(`	  ${tmpVar} = fmax(${tmpVar}, ${this.arrayFunctionCode});`)
      }
      if (fn === '_VECTOR_SELECT') {
        this.tmpVarCode.push(`    ${condVar} = true;`)
        this.tmpVarCode.push('    }')
      }
      // Close the array function loops.
      for (let i = 0; i < this.markedDims.length; i++) {
        this.tmpVarCode.push(`	}`)
      }
      this.callStack.pop()
      // Reset state variables that were set down in the parse tree.
      this.markedDims = []
      this.arrayFunctionCode = ''
      this.currentArrayFunctionName = ''
      // Emit the temporary variable into the formula expression in place of the SUM call.
      if (fn === '_VECTOR_SELECT') {
        this.emit(`${condVar} ? ${tmpVar} : ${this.vsNullValue}`)
      } else {
        this.emit(tmpVar)
      }
    } else if (fn === '_VECTOR_ELM_MAP') {
      super.visitCall(ctx)
      this.callStack.pop()
      this.emit(`${this.vemVarName}${this.vemSubscriptGen()}`)
      this.vemVarName = ''
      this.vemSubscripts = []
      this.vemIndexDim = ''
      this.vemIndexBase = 0
      this.vemOffset = ''
    } else if (fn === '_VECTOR_SORT_ORDER') {
      super.visitCall(ctx)
      let dimSize = sub(this.vsoTmpDimName).size
      let vso = `  double* ${this.vsoTmpName} = _VECTOR_SORT_ORDER(${this.vsoVarName}, ${dimSize}, ${this.vsoOrder});`
      // Inject the VSO call into the loop opening code that was aleady emitted into that channel.
      this.subscriptLoopOpeningCode.splice(this.var.subscripts.length - 1, 0, vso)
      this.callStack.pop()
      this.vsoVarName = ''
      this.vsoOrder = ''
      this.vsoTmpName = ''
      this.vsoTmpDimName = ''
    } else if (fn === '_ALLOCATE_AVAILABLE') {
      super.visitCall(ctx)
      let dimSize = sub(this.aaTmpDimName).size
      let aa = `  double* ${this.aaTmpName} = _ALLOCATE_AVAILABLE(${this.aaRequestArray}, (double*)${this.aaPriorityArray}, ${this.aaAvailableResource}, ${dimSize});`
      // Inject the AA call into the loop opening code that was aleady emitted into that channel.
      this.subscriptLoopOpeningCode.splice(this.var.subscripts.length - 1, 0, aa)
      this.callStack.pop()
      this.aaRequestArray = ''
      this.aaPriorityArray = ''
      this.aaAvailableResource = ''
      this.aaTmpName = ''
      this.aaTmpDimName = ''
    } else if (fn === '_GET_DATA_BETWEEN_TIMES') {
      this.emit('_GET_DATA_BETWEEN_TIMES(')
      super.visitCall(ctx)
      this.emit(')')
      this.callStack.pop()
    } else if (this.functionIsLookup() || this.var.isData()) {
      // A lookup has function syntax but lookup semantics. Convert the function call into a lookup call.
      this.emit(`_LOOKUP(${this.lookupName()}, `)
      super.visitCall(ctx)
      this.emit(')')
      this.callStack.pop()
    } else if (fn === '_ACTIVE_INITIAL') {
      // Only emit the eval-time initialization without the function call for ACTIVE INITIAL.
      super.visitCall(ctx)
    } else if (fn === '_IF_THEN_ELSE') {
      // Conditional expressions are handled specially in `visitExprList`.
      super.visitCall(ctx)
      this.callStack.pop()
    } else if (isSmoothFunction(fn)) {
      // For smooth functions, replace the entire call with the expansion variable generated earlier.
      let smoothVar = Model.varWithRefId(this.var.smoothVarRefId)
      this.emit(smoothVar.varName)
      this.emit(this.rhsSubscriptGen(smoothVar.subscripts))
    } else if (isTrendFunction(fn)) {
      // For trend functions, replace the entire call with the expansion variable generated earlier.
      let trendVar = Model.varWithRefId(this.var.trendVarName)
      let rhsSubs = this.rhsSubscriptGen(trendVar.subscripts)
      this.emit(`${this.var.trendVarName}${rhsSubs}`)
    } else if (isNpvFunction(fn)) {
      // For NPV functions, replace the entire call with the expansion variable generated earlier.
      let npvVar = Model.varWithRefId(this.var.npvVarName)
      let rhsSubs = this.rhsSubscriptGen(npvVar.subscripts)
      this.emit(`${this.var.npvVarName}${rhsSubs}`)
    } else if (isDelayFunction(fn)) {
      // For delay functions, replace the entire call with the expansion variable generated earlier.
      let delayVar = Model.varWithRefId(this.var.delayVarRefId)
      let rhsSubs = this.rhsSubscriptGen(delayVar.subscripts)
      this.emit(`(${delayVar.varName}${rhsSubs} / ${this.var.delayTimeVarName}${rhsSubs})`)
    } else {
      // Generate code for ordinary function calls here.
      this.emit(fn)
      this.emit('(')
      super.visitCall(ctx)
      this.emit(')')
      this.callStack.pop()
    }
  }
  visitExprList(ctx) {
    let exprs = ctx.expr()
    let fn = this.currentFunctionName()
    // Split level functions into init and eval expressions.
    if (
      fn === '_INTEG' ||
      fn === '_SAMPLE_IF_TRUE' ||
      fn === '_ACTIVE_INITIAL' ||
      fn === '_DELAY_FIXED' ||
      fn === '_DEPRECIATE_STRAIGHTLINE'
    ) {
      if (this.mode.startsWith('init')) {
        // Get the index of the argument holding the initial value.
        let i = 0
        if (fn === '_INTEG' || fn === '_ACTIVE_INITIAL') {
          i = 1
        } else if (fn === '_SAMPLE_IF_TRUE' || fn === '_DELAY_FIXED') {
          i = 2
        } else if (fn === '_DEPRECIATE_STRAIGHTLINE') {
          i = 3
        }
        this.setArgIndex(i)
        exprs[i].accept(this)
        // For DELAY FIXED and DEPRECIATE STRAIGHTLINE, also initialize the support struct
        // out of band, as they are not Vensim vars.
        if (fn === '_DELAY_FIXED') {
          let fixedDelay = `${this.var.fixedDelayVarName}${this.lhsSubscriptGen(this.var.subscripts)}`
          this.emit(`;\n  ${fixedDelay} = __new_fixed_delay(${fixedDelay}, `)
          this.setArgIndex(1)
          exprs[1].accept(this)
          this.emit(', ')
          this.setArgIndex(2)
          exprs[2].accept(this)
          this.emit(')')
        } else if (fn === '_DEPRECIATE_STRAIGHTLINE') {
          let depreciation = `${this.var.depreciationVarName}${this.lhsSubscriptGen(this.var.subscripts)}`
          this.emit(`;\n  ${depreciation} = __new_depreciation(${depreciation}, `)
          this.setArgIndex(1)
          exprs[1].accept(this)
          this.emit(', ')
          this.setArgIndex(2)
          exprs[3].accept(this)
          this.emit(')')
        }
      } else {
        // We are in eval mode, not init mode.
        if (fn === '_ACTIVE_INITIAL') {
          // For ACTIVE INITIAL, emit the first arg without a function call.
          this.setArgIndex(0)
          exprs[0].accept(this)
        } else if (fn === '_DELAY_FIXED') {
          // For DELAY FIXED, emit the first arg followed by the FixedDelay support var.
          this.setArgIndex(0)
          exprs[0].accept(this)
          this.emit(', ')
          this.emit(`${this.var.fixedDelayVarName}${this.lhsSubscriptGen(this.var.subscripts)}`)
        } else if (fn === '_DEPRECIATE_STRAIGHTLINE') {
          // For DEPRECIATE STRAIGHTLINE, emit the first arg followed by the Depreciation support var.
          this.setArgIndex(0)
          exprs[0].accept(this)
          this.emit(', ')
          this.emit(`${this.var.depreciationVarName}${this.lhsSubscriptGen(this.var.subscripts)}`)
        } else {
          // Emit the variable LHS as the first arg at eval time, giving the current value for the level.
          this.emit(this.lhs)
          this.emit(', ')
          // Emit the remaining arguments by visiting each expression in the list.
          this.setArgIndex(0)
          exprs[0].accept(this)
          if (fn === '_SAMPLE_IF_TRUE') {
            this.emit(', ')
            this.setArgIndex(1)
            exprs[1].accept(this)
          }
        }
      }
    } else if (fn === '_VECTOR_SELECT') {
      this.setArgIndex(0)
      exprs[0].accept(this)
      this.setArgIndex(1)
      exprs[1].accept(this)
      this.setArgIndex(2)
      this.vsNullValue = this.cVarOrConst(exprs[2])
      // TODO implement other actions besides just sum and max
      this.setArgIndex(3)
      this.vsAction = this.constValue(exprs[3].getText().trim())
      // TODO obey the error handling instruction here
      this.setArgIndex(4)
      this.vsError = this.cVarOrConst(exprs[4])
    } else if (fn === '_VECTOR_ELM_MAP') {
      this.setArgIndex(0)
      exprs[0].accept(this)
      this.setArgIndex(1)
      exprs[1].accept(this)
    } else if (fn === '_VECTOR_SORT_ORDER') {
      this.setArgIndex(0)
      exprs[0].accept(this)
      this.setArgIndex(1)
      this.vsoOrder = this.cVarOrConst(exprs[1])
    } else if (fn === '_ALLOCATE_AVAILABLE') {
      this.setArgIndex(0)
      exprs[0].accept(this)
      this.setArgIndex(1)
      exprs[1].accept(this)
      this.setArgIndex(2)
      this.aaAvailableResource = this.cVarOrConst(exprs[2])
    } else if (fn === '_IF_THEN_ELSE') {
      // See if the condition expression was previously determined to resolve to a
      // compile-time constant.  If so, we only need to emit code for one branch.
      const condText = ctx.expr(0).getText()
      const condValue = Model.getConstantExprValue(condText)
      if (condValue !== undefined) {
        this.emit('(')
        if (condValue !== 0) {
          // Emit only the "if true" branch
          this.setArgIndex(1)
          ctx.expr(1).accept(this)
        } else {
          // Emit only the "if false" branch
          this.setArgIndex(2)
          ctx.expr(2).accept(this)
        }
        this.emit(')')
      } else {
        // Emit a normal if/else with both branches
        this.emit(fn)
        this.emit('(')
        for (let i = 0; i < exprs.length; i++) {
          if (i > 0) this.emit(', ')
          this.setArgIndex(i)
          exprs[i].accept(this)
        }
        this.emit(')')
      }
    } else {
      // Ordinary expression lists are completely emitted with comma delimiters.
      for (let i = 0; i < exprs.length; i++) {
        if (i > 0) this.emit(', ')
        this.setArgIndex(i)
        exprs[i].accept(this)
      }
    }
  }
  visitVar(ctx) {
    // Helper function that emits a lookup call if the variable is a data variable,
    // otherwise emits a normal variable.
    const emitVar = () => {
      let v = Model.varWithName(this.currentVarName())
      if (v && v.varType === 'data') {
        this.emit(`_LOOKUP(${this.currentVarName()}`)
        super.visitVar(ctx)
        this.emit(', _time)')
      } else {
        this.emit(this.currentVarName())
        super.visitVar(ctx)
      }
    }

    // Push the var name on the stack and then emit it.
    let id = ctx.Id().getText()
    let varName = canonicalName(id)
    if (isDimension(varName)) {
      if (this.currentFunctionName() === '_ELMCOUNT') {
        // Emit the size of the dimension in place of the dimension name.
        this.emit(`${sub(varName).size}`)
      } else {
        // A subscript masquerading as a variable takes the value of the loop index var plus one
        // (since Vensim indices are one-based).
        let s = this.rhsSubscriptGen([varName])
        // Remove the brackets around the C subscript expression.
        s = s.slice(1, s.length - 1)
        this.emit(`(${s} + 1)`)
      }
    } else {
      this.varNames.push(varName)
      if (this.currentFunctionName() === '_VECTOR_SELECT') {
        let argIndex = this.argIndexForFunctionName('_VECTOR_SELECT')
        if (argIndex === 0) {
          this.vsSelectionArray = this.currentVarName()
          super.visitVar(ctx)
        } else if (argIndex === 1) {
          emitVar()
        } else {
          super.visitVar(ctx)
        }
      } else if (this.currentFunctionName() === '_VECTOR_ELM_MAP') {
        if (this.argIndexForFunctionName('_VECTOR_ELM_MAP') === 1) {
          this.vemOffset = this.currentVarName()
        }
        super.visitVar(ctx)
      } else if (this.currentFunctionName() === '_VECTOR_SORT_ORDER') {
        if (this.argIndexForFunctionName('_VECTOR_SORT_ORDER') === 0) {
          this.vsoVarName = this.currentVarName()
          this.vsoTmpName = newTmpVarName()
          this.emit(this.vsoTmpName)
        }
        super.visitVar(ctx)
      } else if (this.currentFunctionName() === '_ALLOCATE_AVAILABLE') {
        if (this.argIndexForFunctionName('_ALLOCATE_AVAILABLE') === 0) {
          this.aaRequestArray = this.currentVarName()
          this.aaTmpName = newTmpVarName()
          this.emit(this.aaTmpName)
        } else if (this.argIndexForFunctionName('_ALLOCATE_AVAILABLE') === 1) {
          this.aaPriorityArray = this.currentVarName()
        }
        super.visitVar(ctx)
      } else if (this.currentFunctionName() === '_GET_DATA_BETWEEN_TIMES') {
        this.emit(this.currentVarName())
        super.visitVar(ctx)
      } else {
        emitVar()
      }
      this.varNames.pop()
    }
  }
  visitLookupArg() {
    // Substitute the previously generated lookup arg var name into the expression.
    if (this.var.lookupArgVarName) {
      this.emit(this.var.lookupArgVarName)
    }
  }
  visitLookupCall(ctx) {
    // Make a lookup argument into a _LOOKUP function call.
    let id = ctx.Id().getText()
    this.varNames.push(canonicalName(id))
    this.emit(`_LOOKUP(${canonicalName(id)}`)
    // Emit subscripts after the var name, if any.
    super.visitLookupCall(ctx)
    this.emit(', ')
    ctx.expr().accept(this)
    this.emit(')')
    this.varNames.pop()
  }
  visitSubscriptList(ctx) {
    // Emit subscripts for a variable occurring on the RHS.
    if (ctx.parentCtx.ruleIndex === ModelParser.RULE_expr) {
      let subscripts = R.map(id => canonicalName(id.getText()), ctx.Id())
      let mergeMarkedDims = () => {
        // Extract all marked dimensions and update subscripts.
        let dims = extractMarkedDims(subscripts)
        // Merge marked dims that were found into the list for this call.
        this.markedDims = R.uniq(R.concat(this.markedDims, dims))
      }
      let fn = this.currentFunctionName()
      let arrayFn = this.currentArrayFunctionName
      if (arrayFn === '_SUM' || arrayFn === '_VMIN' || arrayFn === '_VMAX') {
        mergeMarkedDims()
        this.emit(this.rhsSubscriptGen(subscripts))
      } else if (arrayFn === '_VECTOR_SELECT') {
        let argIndex = this.argIndexForFunctionName('_VECTOR_SELECT')
        if (argIndex === 0) {
          mergeMarkedDims()
          this.vsSelectionArray += this.rhsSubscriptGen(subscripts)
        } else if (argIndex === 1) {
          mergeMarkedDims()
          this.emit(this.rhsSubscriptGen(subscripts))
        }
      } else if (fn === '_VECTOR_ELM_MAP') {
        if (this.argIndexForFunctionName('_VECTOR_ELM_MAP') === 0) {
          this.vemVarName = this.currentVarName()
          // Gather information from the argument to generate code later.
          // The marked dim is an index in the vector argument.
          this.vemSubscripts = subscripts
          for (let subscript of subscripts) {
            if (isIndex(subscript)) {
              let ind = sub(subscript)
              this.vemIndexDim = ind.family
              this.vemIndexBase = ind.value
              break
            }
          }
        } else {
          // Add subscripts to the offset argument.
          this.vemOffset += this.rhsSubscriptGen(subscripts)
        }
      } else if (fn === '_VECTOR_SORT_ORDER') {
        if (this.argIndexForFunctionName('_VECTOR_SORT_ORDER') === 0) {
          this.vsoSubscriptGen(subscripts)
        }
      } else if (fn === '_ALLOCATE_AVAILABLE') {
        if (this.argIndexForFunctionName('_ALLOCATE_AVAILABLE') === 0) {
          this.aaSubscriptGen(subscripts)
        }
      } else {
        // Add C subscripts to the variable name that was already emitted.
        this.emit(this.rhsSubscriptGen(subscripts))
      }
    }
  }
  visitConstList(ctx) {
    let emitConstAtPos = i => {
      this.emit(strToConst(exprs[i].getText()))
    }
    let exprs = ctx.expr()
    // console.error(`visitConstList ${this.var.refId} ${exprs.length} exprs`)
    if (exprs.length === 1) {
      // Emit a single constant into the expression code.
      emitConstAtPos(0)
    } else {
      // All const lists with > 1 value are separated on dimensions in the LHS.
      // The LHS of a separated variable here will contain only index subscripts in normal order.
      // Calculate an index into a flattened array by converting the indices to numeric form and looking them up
      // in a C name array listed in the same Vensim order as the constant array in the model.
      let modelLHSReader = new ModelLHSReader()
      modelLHSReader.read(this.var.modelLHS)
      let cNames = modelLHSReader.names().map(Model.cName)
      let cVarName = this.var.varName + R.map(indName => `[${sub(indName).value}]`, this.var.subscripts).join('')
      // Find the position of the constant in Vensim order from the expanded LHS var list.
      let constPos = R.indexOf(cVarName, cNames)
      if (constPos >= 0) {
        emitConstAtPos(constPos)
        // console.error(`${this.var.refId} position = ${constPos}`)
      } else {
        console.error(`ERROR: const list element ${this.var.refId} → ${cVarName} not found in C names`)
      }
    }
  }
  //
  // Operators, etc.
  //
  visitNegative(ctx) {
    this.emit('-')
    super.visitNegative(ctx)
  }
  visitNot(ctx) {
    this.emit('!')
    super.visitNot(ctx)
  }
  visitPower(ctx) {
    this.emit('pow(')
    ctx.expr(0).accept(this)
    this.emit(', ')
    ctx.expr(1).accept(this)
    this.emit(')')
  }
  visitMulDiv(ctx) {
    ctx.expr(0).accept(this)
    if (ctx.op.type === ModelLexer.Star) {
      this.emit(' * ')
    } else {
      this.emit(' / ')
    }
    ctx.expr(1).accept(this)
  }
  visitAddSub(ctx) {
    ctx.expr(0).accept(this)
    if (ctx.op.type === ModelLexer.Plus) {
      this.emit(' + ')
    } else {
      this.emit(' - ')
    }
    ctx.expr(1).accept(this)
  }
  visitRelational(ctx) {
    ctx.expr(0).accept(this)
    if (ctx.op.type === ModelLexer.Less) {
      this.emit(' < ')
    } else if (ctx.op.type === ModelLexer.Greater) {
      this.emit(' > ')
    } else if (ctx.op.type === ModelLexer.LessEqual) {
      this.emit(' <= ')
    } else {
      this.emit(' >= ')
    }
    ctx.expr(1).accept(this)
  }
  visitEquality(ctx) {
    ctx.expr(0).accept(this)
    if (ctx.op.type === ModelLexer.Equal) {
      this.emit(' == ')
    } else {
      this.emit(' != ')
    }
    ctx.expr(1).accept(this)
  }
  visitAnd(ctx) {
    ctx.expr(0).accept(this)
    this.emit(' && ')
    ctx.expr(1).accept(this)
  }
  visitOr(ctx) {
    ctx.expr(0).accept(this)
    this.emit(' || ')
    ctx.expr(1).accept(this)
  }
  visitKeyword(ctx) {
    var keyword = ctx.Keyword().getText()
    if (keyword === ':NA:') {
      keyword = '_NA_'
    } else if (keyword === ':INTERPOLATE:') {
      keyword = ''
    }
    this.emit(keyword)
  }
  visitConst(ctx) {
    let c = ctx.Const().getText()
    this.emit(strToConst(c))
  }
  visitParens(ctx) {
    this.emit('(')
    super.visitParens(ctx)
    this.emit(')')
  }
}
