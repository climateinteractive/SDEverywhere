// Copyright (c) 2024 Climate Interactive / New Venture Fund

import {
  generateCode,
  getModelListing,
  parseInlineVensimModel,
  resetState as resetCompileState
} from '@sdeverywhere/compile'

import { createSynchronousModelRunner, type JsModel, type ModelRunner, type Outputs } from '@sdeverywhere/runtime'

import { parseInlineXmileModel } from '@sdeverywhere/compile'

import type { GraphViewModel } from './components/graph/graph-vm'

const initialMdl = `\
<xmile xmlns="http://docs.oasis-open.org/xmile/ns/XMILE/v1.0" version="1.0">
<header>
    <options namespace="std"/>
    <vendor>isee systems, inc.</vendor>
    <product version="3.7" lang="en">Stella Architect</product>
</header>
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>0</start>
    <stop>5</stop>
    <dt>1</dt>
</sim_specs>
<model>
<variables>
    <aux name="x">
        <eqn>TIME</eqn>
    </aux>
    <aux name="y">
        <eqn>x * x</eqn>
    </aux>
</variables>
</model>
</xmile>
`

/** Information about a variable in the model. */
export interface VarInfo {
  refId: string
  varName: string
  references: string[]
  hasInitValue: boolean
  varType: 'const' | 'data' | 'aux' | 'level'
  modelLHS: string
  modelFormula: string
  varIndex?: number
}

/** Information about a generated model. */
export interface GeneratedModelInfo {
  jsCode: string
  inputVars: VarInfo[]
  outputVars: VarInfo[]
}

/** A compilation message (error or warning). */
export interface CompileMessage {
  type: 'error' | 'warning' | 'info'
  message: string
  line?: number
  column?: number
}

/** Internal state for a generated model including its runner. */
interface GeneratedModel {
  info: GeneratedModelInfo
  runner: ModelRunner
  outputs: Outputs
}

/** Option for a selector control. */
export interface SelectorOption {
  label: string
  value: string
  disabled?: boolean
  hidden?: boolean
}

/**
 * Application view model using Svelte 5 runes.
 * This class manages the state for the playground application.
 */
export class AppViewModel {
  /** The source model text (editable by the user). */
  sourceModel = $state(initialMdl)

  /** The generated model (internal state, but exposed for graph access). */
  generatedModel = $state<GeneratedModel | undefined>(undefined)

  /** The ID of the currently selected output variable. */
  selectedVarId = $state<string | undefined>(undefined)

  /** Compilation messages (errors and warnings). */
  messages = $state<CompileMessage[]>([])

  /** Whether compilation is in progress. */
  isCompiling = $state(false)

  /** The generated model info (derived from generatedModel). */
  generatedModelInfo = $derived(this.generatedModel?.info)

  /** Options for the variable selector dropdown. */
  varSelectorOptions = $derived.by(() => {
    const info = this.generatedModel?.info
    if (!info) return []
    return info.outputVars.map(varInfo => ({
      label: varInfo.refId,
      value: varInfo.refId
    }))
  })

  /** Key counter for graph updates. */
  private graphKey = 0

  /** The graph view model for the selected variable (derived). */
  selectedVarGraph = $derived.by((): GraphViewModel | undefined => {
    const model = this.generatedModel
    const varId = this.selectedVarId
    if (model === undefined || varId === undefined) {
      return undefined
    }

    const outputs = model.outputs
    model.runner.runModelSync([], outputs)

    return {
      key: `${this.graphKey++}`,
      points: outputs.getSeriesForVar(varId)?.points || []
    }
  })

  constructor() {
    // Compile the initial model immediately
    this.compileModel(this.sourceModel)
  }

  /**
   * Compile the source model and update state.
   * Call this method when the source model changes.
   *
   * @param mdl The model source text to compile.
   */
  async compileModel(mdl: string): Promise<void> {
    // Reset state
    this.generatedModel = undefined
    this.selectedVarId = undefined
    this.messages = []
    this.isCompiling = true

    try {
      // Read the model and generate JS code
      const generatedModelInfo = readInlineModelAndGenerateJS(mdl)

      // Initialize a model runner
      const runner = await initModelRunner(generatedModelInfo.jsCode)
      const outputs = runner.createOutputs()
      this.generatedModel = {
        info: generatedModelInfo,
        runner,
        outputs
      }

      // Select the first output variable by default
      const outputVarIds = generatedModelInfo.outputVars.map(varInfo => varInfo.refId) || []
      if (outputVarIds.length > 0) {
        this.selectedVarId = outputVarIds[0]
      }

      // Add success message
      this.messages = [
        {
          type: 'info',
          message: `Model compiled successfully. Found ${generatedModelInfo.inputVars.length} input variables and ${generatedModelInfo.outputVars.length} output variables.`
        }
      ]
    } catch (e) {
      // Display error in Messages tab
      const errorMessage = e instanceof Error ? e.message : String(e)
      this.messages = [
        {
          type: 'error',
          message: `Compilation failed: ${errorMessage}`
        }
      ]
      console.error('Failed to compile model:', e)
    } finally {
      this.isCompiling = false
    }
  }
}

/**
 * Read an inline model and generate JavaScript code.
 *
 * @param mdlContent The model content (XMILE or Vensim MDL format).
 * @param opts Optional configuration for input/output variable names.
 * @returns The generated model information.
 */
function readInlineModelAndGenerateJS(
  mdlContent: string,
  opts?: {
    inputVarNames?: string[]
    outputVarNames?: string[]
  }
): GeneratedModelInfo {
  // Reset compile state (needed due to subs/dims and variables being in module-level storage)
  resetCompileState()

  let spec
  if (opts?.inputVarNames || opts?.outputVarNames) {
    spec = {
      inputVarNames: opts?.inputVarNames || [],
      outputVarNames: opts?.outputVarNames || []
    }
  } else {
    spec = {}
  }

  let parsedModel
  if (mdlContent.includes('<xmile')) {
    // Parse the XMILE model
    parsedModel = parseInlineXmileModel(mdlContent)
  } else {
    // Parse the Vensim model
    parsedModel = parseInlineVensimModel(mdlContent)
  }

  // Look for data variables in the parsed model. For now we don't allow the user to
  // supply a CSV or DAT file containing that data, but the compiler will not be able
  // to process the model if there is no data defined for those variables, so we will
  // fill the map with dummy data for now.
  const extData = new Map()
  for (const equation of parsedModel.root.equations) {
    if (equation.rhs.kind === 'data') {
      // TODO: Handle subscripted data variables
      const varId = equation.lhs.varDef.varId
      const points = new Map()
      // TODO: Set default data points for start and end times
      points.set(0, 0)
      points.set(3, 2)
      points.set(5, 1)
      extData.set(varId, points)
    }
  }

  // Generate JS code
  const jsCode = generateCode(parsedModel, {
    spec,
    operations: ['generateJS'],
    extData
  })

  // Parse the JSON listing to determine input and output variables
  const listing = getModelListing()
  const inputVars: VarInfo[] = []
  const outputVars: VarInfo[] = []
  for (const varInfo of listing.full.variables) {
    // Ignore control variables
    switch (varInfo.varName) {
      case '_final_time':
      case '_initial_time':
      case '_time_step':
      case '_saveper':
        continue
      default:
        break
    }

    switch (varInfo.varType) {
      case 'const':
        inputVars.push(varInfo)
        break
      case 'aux':
      case 'level':
        outputVars.push(varInfo)
        break
      default:
        break
    }
  }

  return {
    jsCode,
    inputVars,
    outputVars
  }
}

/**
 * Initialize a model runner from generated JavaScript code.
 *
 * @param modelJs The generated JavaScript code for the model.
 * @returns A promise that resolves to a ModelRunner.
 */
async function initModelRunner(modelJs: string): Promise<ModelRunner> {
  const dataUri = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(modelJs)
  // TODO: Fix this so that we don't need the vite-ignore
  const generatedModule = await import(/* @vite-ignore */ dataUri)
  const generatedModel = (await generatedModule.default()) as JsModel
  return createSynchronousModelRunner(generatedModel)
}
