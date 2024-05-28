import { derived, writable, type Readable, type Writable } from 'svelte/store'

import {
  ModelListing,
  createLookupDef,
  type ModelRunner,
  type Outputs,
  type Point,
  type VarSpec
} from '@sdeverywhere/runtime'

import { AppModel, createAppModel } from './model/app-model'
import { type AppState, stateForIndex } from './model/app-state'

import { AssumptionsViewModel, createAssumptionsViewModel } from './components/assumptions/assumptions-vm'
import type { GraphViewModel } from './components/graph/graph-vm'

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
  listing: ModelListing
  dataVars: VarInfo[]
  inputVars: VarInfo[]
  outputVars: VarInfo[]
}

interface GeneratedModel {
  info: GeneratedModelInfo
  runner: ModelRunner
  outputs: Outputs
  dataVarSpec: VarSpec
}

export async function createAppViewModel(): Promise<AppViewModel> {
  // Initialize the app model that wraps the generated model
  const appModel = await createAppModel()

  // Create the `AppViewModel` instance
  return new AppViewModel(appModel)
}

export class AppViewModel {
  private readonly writableBusy: Writable<boolean>
  public readonly busy: Readable<boolean>

  private internalCurrentTime: number
  private readonly writableCurrentTime: Writable<number>
  public readonly currentTime: Readable<number>

  public readonly writableCurrentValue: Writable<number>

  private currentStateIndex: number
  private writableState: Writable<AppState>

  public readonly message: Readable<string>
  public readonly assumptions: Readable<AssumptionsViewModel>

  private readonly writableDataChanged: Writable<number>
  private readonly writableLookupPoints: Writable<Point[]>
  // private readonly writableStopAfterTime: Writable<number>

  public readonly supplyGraphViewModel: GraphViewModel
  // public readonly gapGraphViewModel: GraphViewModel

  constructor(private readonly appModel: AppModel) {
    this.writableBusy = writable(false)
    this.busy = this.writableBusy

    this.internalCurrentTime = 0
    this.writableCurrentTime = writable(0)
    this.currentTime = this.writableCurrentTime

    this.writableCurrentValue = writable(0)

    this.currentStateIndex = 0
    this.writableState = writable(stateForIndex(0))
    this.message = derived(this.writableState, $state => {
      return $state.message
    })
    this.assumptions = derived(this.writableState, $state => {
      return createAssumptionsViewModel($state.modelInputs)
    })

    this.writableLookupPoints = writable([])

    this.writableDataChanged = writable(0)

    const xMin = 0
    const xMax = 100
    this.supplyGraphViewModel = {
      spec: {
        xAxisLabel: 'time (months)',
        xMin,
        xMax,
        yAxisLabel: 'houses',
        yMin: 800,
        yMax: 1600,
        datasets: [
          {
            varId: '_houses_completed',
            color: 'magenta'
          },
          {
            varId: '_number_of_houses_required',
            color: '#4080e0',
            lineStyle: 'wide'
          }
        ]
      },
      data: new Map(),
      dataChanged: this.writableDataChanged
    }

    this.reset()
  }

  public nextStep(): void {
    this.currentStateIndex++
    const state = stateForIndex(this.currentStateIndex)
    this.runModel(state)
    this.writableState.set(state)
  }

  public reset(): void {
    this.internalCurrentTime = 0
    this.writableCurrentTime.set(this.internalCurrentTime)

    this.currentStateIndex = 0
    const state = stateForIndex(this.currentStateIndex)
    this.runModel(state)
    this.writableState.set(state)
  }

  private updateGraphData(maxTime: number): void {
    const dataSource = this.appModel
    // const lastIndex = this.internalCurrentTime + 1
    const dataChanged = this.writableDataChanged
    function updateData(graphViewModel: GraphViewModel) {
      for (const datasetSpec of graphViewModel.spec.datasets) {
        const series = dataSource.getSeriesForVar(datasetSpec.varId)
        if (series) {
          const points = series.points.filter(p => p.x <= maxTime)
          graphViewModel.data.set(datasetSpec.varId, points)
        }
      }
      dataChanged.update(n => n + 1)
    }
    updateData(this.supplyGraphViewModel)
  }

  private runModel(state: AppState): void {
    const modelInputs = state.modelInputs
    const inputValues: number[] = []

    inputValues.push(modelInputs.addlRequired ? modelInputs.addlRequired : 0)
    if (isFinite(modelInputs.avgLife) && modelInputs.avgLife >= 0) {
      inputValues.push(modelInputs.avgLife)
    } else {
      inputValues.push(1e12)
    }
    inputValues.push(modelInputs.timeToPlan ? modelInputs.timeToPlan : 3)
    inputValues.push(modelInputs.timeToBuild ? modelInputs.timeToBuild : 6)
    inputValues.push(modelInputs.timeToRespond ? modelInputs.timeToRespond : 8)

    // TODO: Set points correctly
    // const lookupPoints: Point[] = []
    // for (let t = 0; t <= 100; t += 5) {
    //   lookupPoints.push({ x: t, y: modelInputs.currentRate || 0 })
    // }
    // const lookups = [createLookupDef(this.generatedModel.dataVarSpec, lookupPoints)]

    // TODO: Pass lookups
    this.appModel.runModel(inputValues, undefined)

    // const duration = 1000
    // this.writableBusy.set(true)
    // for (let i = 0; i <= duration; i += 20) {
    //   // TODO: Use minGraphTime here
    //   const animTimeInMonths = (i / duration) * state.maxGraphTime
    //   setTimeout(() => {
    //     this.updateGraphData(animTimeInMonths)
    //     if (i === duration) {
    //       this.writableBusy.set(false)
    //     }
    //   }, i)
    // }

    // this.updateGraphData(state.maxGraphTime)
  }

  // private async setSourceModel(mdl: string): Promise<void> {
  //   // Reset state
  //   this.writableGeneratedModel.set(undefined)
  //   this.writableSelectedVarId.set(undefined)

  //   // Read the model and generate JS code
  //   const generatedModelInfo = readInlineModelAndGenerateJS(mdl)

  //   // Prepare the lookup that holds the game inputs
  //   const dataVarInfo = generatedModelInfo.dataVars[0]
  //   const dataVarSpec = generatedModelInfo.listing.varSpecs.get(dataVarInfo.varName)
  //   // const lookupPoints: Point[] = []
  //   // for (let t = 0; t <= 100; t += 5) {
  //   //   lookupPoints.push({ x: t, y: 0 })
  //   // }
  //   // this.writableLookup.set(createLookupDef(dataVarSpec, lookupPoints))

  //   // Initialize a model runner
  //   const runner = await initModelRunner(generatedModelInfo.jsCode)
  //   const outputs = runner.createOutputs()
  //   this.writableGeneratedModel.set({
  //     info: generatedModelInfo,
  //     runner,
  //     outputs,
  //     dataVarSpec
  //   })
  // }
}

// function readInlineModelAndGenerateJS(
//   mdlContent: string,
//   opts?: {
//     inputVarNames?: string[]
//     outputVarNames?: string[]
//   }
// ): GeneratedModelInfo {
//   // XXX: This step is needed due to subs/dims and variables being in module-level storage
//   resetCompileState()

//   let spec
//   if (opts?.inputVarNames || opts?.outputVarNames) {
//     spec = {
//       inputVarNames: opts?.inputVarNames || [],
//       outputVarNames: opts?.outputVarNames || []
//     }
//   } else {
//     spec = {}
//   }

//   // Parse the Vensim model
//   const parsedModel = parseInlineVensimModel(mdlContent /*, opts?.modelDir*/)

//   // Look for data variables in the parsed model.  For now we don't allow the user to
//   // supply a CSV or DAT file containing that data, but the compiler will not be able
//   // to process the model if there is no data defined for those variables, so we will
//   // fill the map with dummy data for now.
//   const extData = new Map()
//   for (const equation of parsedModel.root.equations) {
//     if (equation.rhs.kind === 'data') {
//       // TODO: Handle subscripted data variables
//       const varId = equation.lhs.varDef.varId
//       const points = new Map()
//       // // TODO: Set default data points for start and end times
//       points.set(0, 0)
//       // points.set(3, 2)
//       // points.set(5, 1)
//       extData.set(varId, points)
//     }
//   }

//   // Generate JS code
//   const jsCode = generateCode(parsedModel, {
//     spec,
//     operations: ['generateJS'],
//     extData
//     // directData,
//     // modelDirname: opts?.modelDir
//   })

//   // console.log(jsCode)

//   // Parse the JSON listing to determine input and output variables
//   const jsonListStr = getModelListing()
//   // console.log(jsonListStr)
//   const listingObj = JSON.parse(jsonListStr)
//   const dataVars = []
//   const inputVars = []
//   const outputVars = []
//   // console.log(listingObj.variables)
//   for (const varInfo of listingObj.variables) {
//     // Ignore control variables
//     switch (varInfo.varName) {
//       case '_final_time':
//       case '_initial_time':
//       case '_time_step':
//       case '_saveper':
//         continue
//       default:
//         break
//     }

//     switch (varInfo.varType) {
//       case 'const':
//         inputVars.push(varInfo)
//         break
//       case 'aux':
//       case 'level':
//         outputVars.push(varInfo)
//         break
//       case 'data':
//         dataVars.push(varInfo)
//         break
//       default:
//         break
//     }
//   }

//   return {
//     jsCode,
//     listing: new ModelListing(jsonListStr),
//     dataVars,
//     inputVars,
//     outputVars
//   }
// }
