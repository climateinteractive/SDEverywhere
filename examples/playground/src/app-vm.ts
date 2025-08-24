import { derived, writable, type Readable, type Writable } from 'svelte/store'

import {
  generateCode,
  getModelListing,
  parseInlineVensimModel,
  resetState as resetCompileState
} from '@sdeverywhere/compile'

import { createSynchronousModelRunner, type JsModel, type ModelRunner, type Outputs } from '@sdeverywhere/runtime'

import { SelectorOptionViewModel, SelectorViewModel } from './components/_shared/selector-vm'
import type { GraphViewModel } from './components/graph/graph-vm'
import { parseInlineXmileModel } from '@sdeverywhere/compile'

// const initialMdl = `\
// x = TIME ~~|

// y = x * x ~~|

// z data ~~|

// z = z data + 2 ~~|

// INITIAL TIME = 0 ~~|
// FINAL TIME = 5 ~~|
// TIME STEP = 1 ~~|
// SAVEPER = 1 ~~|
// `

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

export interface GeneratedModelInfo {
  jsCode: string
  // jsonList: string
  inputVars: VarInfo[]
  outputVars: VarInfo[]
}

interface GeneratedModel {
  info: GeneratedModelInfo
  runner: ModelRunner
  outputs: Outputs
}

export class AppViewModel {
  private readonly writableSourceModel: Writable<string>
  public readonly sourceModel: Readable<string>

  private readonly writableGeneratedModel: Writable<GeneratedModel>

  private readonly writableSelectedVarId: Writable<string>
  private readonly writableVarSelector: Writable<SelectorViewModel>
  public readonly varSelector: Readable<SelectorViewModel>

  public readonly generatedModelInfo: Readable<GeneratedModelInfo>
  public readonly selectedVarGraph: Readable<GraphViewModel>

  constructor() {
    this.writableSourceModel = writable(initialMdl)
    this.sourceModel = this.writableSourceModel

    this.writableGeneratedModel = writable(undefined)

    this.writableSelectedVarId = writable(undefined)
    this.writableVarSelector = writable(undefined)
    this.varSelector = this.writableVarSelector

    this.generatedModelInfo = derived(this.writableGeneratedModel, $generatedModel => {
      return $generatedModel?.info
    })

    // Update the graph data when the model changes or when a new variable is selected
    // TODO: Update outputs when constant or lookup is overridden
    let graphKey = 0
    this.selectedVarGraph = derived(
      [this.writableGeneratedModel, this.writableSelectedVarId],
      ([$generatedModel, $selectedVarId]) => {
        if ($generatedModel === undefined || $selectedVarId === undefined) {
          return undefined
        }

        const outputs = $generatedModel.outputs
        $generatedModel.runner.runModelSync([], outputs)

        return {
          key: `${graphKey++}`,
          points: outputs.getSeriesForVar($selectedVarId)?.points || []
        }
      }
    )

    // XXX: Use a proper async-friendly store here
    this.sourceModel.subscribe(async $sourceModel => {
      await this.setSourceModel($sourceModel)
    })
  }

  private async setSourceModel(mdl: string): Promise<void> {
    // Reset state
    this.writableGeneratedModel.set(undefined)
    this.writableSelectedVarId.set(undefined)

    // Read the model and generate JS code
    const generatedModelInfo = readInlineModelAndGenerateJS(mdl)

    // Initialize a model runner
    const runner = await initModelRunner(generatedModelInfo.jsCode)
    const outputs = runner.createOutputs()
    this.writableGeneratedModel.set({
      info: generatedModelInfo,
      runner,
      outputs
    })

    // Update the variable selector and select the first variable by default
    const outputVarIds = generatedModelInfo.outputVars.map(varInfo => varInfo.refId) || []
    const options = outputVarIds.map(varId => new SelectorOptionViewModel(varId, varId))
    if (outputVarIds.length > 0) {
      // TODO: Preserve previous selection if possible
      const selectedVarId = outputVarIds[0]
      this.writableSelectedVarId.set(selectedVarId)
      this.writableVarSelector.set(new SelectorViewModel(options, this.writableSelectedVarId))
    } else {
      this.writableSelectedVarId.set(undefined)
      this.writableVarSelector.set(undefined)
    }
  }
}

function readInlineModelAndGenerateJS(
  mdlContent: string,
  opts?: {
    inputVarNames?: string[]
    outputVarNames?: string[]
  }
): GeneratedModelInfo {
  // XXX: This step is needed due to subs/dims and variables being in module-level storage
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
    parsedModel = parseInlineXmileModel(mdlContent /*, opts?.modelDir*/)
  } else {
    // Parse the Vensim model
    parsedModel = parseInlineVensimModel(mdlContent /*, opts?.modelDir*/)
  }

  // Look for data variables in the parsed model.  For now we don't allow the user to
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
    // directData,
    // modelDirname: opts?.modelDir
  })

  // Parse the JSON listing to determine input and output variables
  const listing = getModelListing()
  const inputVars = []
  const outputVars = []
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

async function initModelRunner(modelJs: string): Promise<ModelRunner> {
  const dataUri = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(modelJs)
  // TODO: Fix this so that we don't need the vite-ignore
  const generatedModule = await import(/* @vite-ignore */ dataUri)
  const generatedModel = (await generatedModule.default()) as JsModel
  return createSynchronousModelRunner(generatedModel)
}
