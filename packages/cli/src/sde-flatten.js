import path from 'path'

import B from 'bufx'

import { preprocessModel } from '@sdeverywhere/compile'

import { buildDir, modelPathProps } from './utils.js'

const command = 'flatten [options] <outmodel>'

// TODO: Set to false for now to keep it hidden from the help menu, since
// this is an experimental feature
//const describe = 'flatten submodels into a single preprocessed mdl file'
const describe = false

const builder = {
  builddir: {
    describe: 'build directory',
    type: 'string',
    alias: 'b'
  },
  inputs: {
    describe: 'input mdl files',
    demand: true,
    type: 'array'
  }
}

const handler = argv => {
  flatten(argv.outmodel, argv.inputs, argv)
}

const flatten = async (outFile, inFiles, opts) => {
  // Ensure the build directory exists
  // TODO: Since the input mdl files can technically exist in more than
  // one directory, we don't want to guess, so just use the current directory
  // if one isn't provided on the command line
  const buildDirname = buildDir(opts.builddir, '.')

  // Extract the equations and declarations from each parent or submodel file
  // and store them into a map keyed by source file
  const fileDecls = {}
  for (const inFile of inFiles) {
    // Get the path and short name of the input mdl file
    const inModelProps = modelPathProps(inFile)

    // Preprocess the mdl file and extract the equations
    const decls = []
    preprocessModel(inModelProps.modelPathname, undefined, 'genc', false, decls)

    // Associate each declaration with the name of the model from which it came
    for (const decl of decls) {
      decl.sourceModelName = inModelProps.modelName
    }

    fileDecls[inModelProps.modelName] = decls
  }

  // Collapse so that we have only one equation or declaration per key.
  // Equations that are defined in a different submodel will appear like
  // a data variable in the model file where it is used (i.e., no equals
  // sign).  If we see an equation, that takes priority over a "data"
  // declaration.
  const collapsed = {}
  let hasErrors = false
  for (const modelName of Object.keys(fileDecls)) {
    const decls = fileDecls[modelName]
    for (const decl of decls) {
      const existingDecl = collapsed[decl.key]
      if (existingDecl) {
        // We've already seen a declaration with this key (from another file)
        if (decl.kind === existingDecl.kind) {
          if (decl.kind === 'sub') {
            // The subscript keys are the same, so see if the contents are the same
            if (decl.processedDecl !== existingDecl.processedDecl) {
              // TODO: If we see two subscript declarations that differ, it's
              // probably because a submodel uses a simplified set of dimension
              // mappings, while the parent includes a superset of mappings.
              // We should add more checks here, like see if the mappings in one
              // are a subset of the other, but for now, we will emit a warning
              // and just take the longer of the two.
              let longerDecl
              if (decl.processedDecl.length > existingDecl.processedDecl.length) {
                longerDecl = decl
              } else {
                longerDecl = existingDecl
              }
              collapsed[decl.key] = longerDecl
              let warnMsg = 'Subscript declarations are different; '
              warnMsg += `will use the one from '${longerDecl.sourceModelName}.mdl' because it is longer`
              console.warn('----------')
              console.warn(`\nWARNING: ${warnMsg}:`)
              console.warn(`\nIn ${existingDecl.sourceModelName}.mdl:`)
              console.warn(`${existingDecl.processedDecl}`)
              console.warn(`\nIn ${decl.sourceModelName}.mdl:`)
              console.warn(`${decl.processedDecl}\n`)
            }
          } else if (decl.kind === 'eqn') {
            // The equation keys are the same, so see if the contents are the same
            if (decl.processedDecl !== existingDecl.processedDecl) {
              hasErrors = true
              console.error('----------')
              console.error(`\nERROR: Differing equations:`)
              console.error(`\nIn ${existingDecl.sourceModelName}.mdl:`)
              console.error(`${existingDecl.processedDecl}`)
              console.error(`\nIn ${decl.sourceModelName}.mdl:`)
              console.error(`${decl.processedDecl}\n`)
            }
          }
        } else if (decl.kind === 'eqn' && existingDecl.kind === 'decl') {
          // Replace the declaration with this equation
          collapsed[decl.key] = decl
        }
      } else {
        // We haven't seen this key yet, so save the declaration
        collapsed[decl.key] = decl
      }
    }
  }

  // XXX: For any subscripted (non-equation) declarations that remain, see if
  // there are any corresponding equations.  This can happen in the case of
  // subscripted variables that are defined in multiple parts in one submodel,
  // but are declared using the full set in the consuming model.
  // For example, in the submodel:
  //   Variable[SubscriptA_Subset1] = ... ~~|
  //   Variable[SubscriptA_Subset2] = ... ~~|
  // In the consuming model:
  //   Variable[SubscriptA_All] ~~|
  // In this case, if we see Variable[SubscriptA_All], we can remove it and
  // use the other `Variable` definitions.
  for (const key of Object.keys(collapsed)) {
    const decl = collapsed[key]
    if (decl.kind === 'decl') {
      const declKeyWithoutSubscript = key.split('[')[0]

      // See if there is another equation that has the same key (minus subscript)
      const otherDeclsThatMatch = []
      for (const otherDecl of Object.values(collapsed)) {
        if (otherDecl.kind === 'eqn') {
          const otherDeclKeyWithoutSubscript = otherDecl.key.split('[')[0]
          if (declKeyWithoutSubscript === otherDeclKeyWithoutSubscript) {
            otherDeclsThatMatch.push(otherDecl)
          }
        }
      }

      if (otherDeclsThatMatch.length > 0) {
        // Remove this declaration and emit a warning
        delete collapsed[key]
        console.warn('----------')
        console.warn(`\nWARNING: Skipping declaration:`)
        console.warn(`\nIn ${decl.sourceModelName}.mdl:`)
        console.warn(`${decl.processedDecl}`)
        console.warn(`\nThe following equations are assumed to provide the necessary data:`)
        for (const otherDecl of otherDeclsThatMatch) {
          console.warn(`\nIn ${otherDecl.sourceModelName}.mdl:`)
          console.warn(`${otherDecl.processedDecl}`)
        }
        console.warn()
      }
    }
  }

  // Exit with a non-zero error code if there are any conflicting declarations
  if (hasErrors) {
    process.exit(1)
  }

  // Sort the declarations alphabetically by LHS variable name
  const sorted = Object.values(collapsed).sort((a, b) => {
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
  })

  // Build a single buffer containing the sorted declarations
  B.open('pp')
  const ENCODING = '{UTF-8}'
  B.emitLine(ENCODING, 'pp')
  B.emitLine('', 'pp')
  for (const decl of sorted) {
    B.emitLine(`${decl.processedDecl}\n`, 'pp')
  }

  // Write the flattened mdl file to the build directory
  const outModelProps = modelPathProps(outFile)
  let outputPathname = path.join(buildDirname, `${outModelProps.modelName}.mdl`)
  B.writeBuf(outputPathname, 'pp')
}

export default {
  command,
  describe,
  builder,
  handler
}
