import { derived, writable, type Readable, type Writable } from 'svelte/store'

import {
  generateCode,
  getModelListing,
  parseInlineVensimModel,
  resetState as resetCompileState
} from '@sdeverywhere/compile'

import {
  ModelListing,
  createLookupDef,
  createSynchronousModelRunner,
  type JsModel,
  type ModelRunner,
  type Outputs,
  type Point,
  type VarSpec
} from '@sdeverywhere/runtime'

import type { GraphViewModel } from './components/graph/graph-vm'

// TODO: Get this from the model
const finalTime = 100

const inputVarNames = [
  'additional houses required at t 40',
  'average house life',
  'time to plan to build',
  'time to build houses',
  'time to respond to gap'
]

const outputVarNames = ['number of houses required', 'houses completed']

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

export interface ModelInputs {
  addlRequired?: number
  avgLife?: number
  currentRate?: number
  timeToBuild?: number
  timeToPlan?: number
  timeToRespond?: number
}

export interface AppState {
  message: string
  modelInputs: ModelInputs
  minGraphTime: number
  maxGraphTime: number
}

export interface AssumptionRow {
  label: string
  value: string
}

export async function createAppViewModel(): Promise<AppViewModel> {
  // Read the model and generate JS code
  const generatedModelInfo = readInlineModelAndGenerateJS(mdl, {
    inputVarNames,
    outputVarNames
  })

  // Prepare the lookup that holds the game inputs
  const dataVarInfo = generatedModelInfo.dataVars[0]
  const dataVarSpec = generatedModelInfo.listing.varSpecs.get(dataVarInfo.varName)

  // Initialize a model runner
  const runner = await initModelRunner(generatedModelInfo.jsCode)
  const outputs = runner.createOutputs()

  // Create the `GeneratedModel` instance
  const generatedModel: GeneratedModel = {
    info: generatedModelInfo,
    runner,
    outputs,
    dataVarSpec
  }

  // Create the `AppViewModel` instance
  return new AppViewModel(generatedModel)
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
  public readonly assumptionRows: Readable<AssumptionRow[]>

  private readonly writableDataChanged: Writable<number>
  private readonly writableLookupPoints: Writable<Point[]>
  // private readonly writableStopAfterTime: Writable<number>

  public readonly supplyGraphViewModel: GraphViewModel
  // public readonly gapGraphViewModel: GraphViewModel

  constructor(private readonly generatedModel: GeneratedModel) {
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
    this.assumptionRows = derived(this.writableState, $state => {
      const rows: AssumptionRow[] = []
      const inputs = $state.modelInputs
      if (inputs.avgLife !== undefined) {
        let value: string
        if (inputs.avgLife < 0) {
          value = '&mdash;'
        } else if (!isFinite(inputs.avgLife)) {
          value = 'infinite'
        } else {
          value = `${inputs.avgLife} months`
        }
        rows.push({
          label: 'Average house life',
          value
        })
      }
      if (inputs.currentRate !== undefined) {
        rows.push({
          label: 'Current build rate',
          value: `${inputs.currentRate} houses/month`
        })
      }
      if (inputs.timeToPlan !== undefined) {
        rows.push({
          label: 'Time to plan',
          value: '3 months'
        })
      }
      if (inputs.timeToBuild !== undefined) {
        rows.push({
          label: 'Time to build',
          value: '6 months'
        })
      }
      if (inputs.timeToRespond !== undefined) {
        rows.push({
          label: 'Time to respond to gap',
          value: '8 months'
        })
      }
      return rows
    })

    this.writableLookupPoints = writable([])
    // this.writableStopAfterTime = writable(0)

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
    // this.gapGraphViewModel = {
    //   spec: {
    //     xMin,
    //     xMax,
    //     yMin: -60,
    //     yMax: 20,
    //     datasets: [
    //       {
    //         varId: '_gap_in_houses',
    //         color: 'green'
    //       }
    //     ]
    //   },
    //   data: new Map(),
    //   dataChanged: writable(0)
    // }

    this.reset()
  }

  public nextStep(): void {
    // this.writableLookupPoints.update(points => {
    //   points.push({
    //     x: get(this.currentTime),
    //     y: 5 // TODO
    //   })
    //   return points
    // })
    // this.internalCurrentTime += 5
    // this.writableCurrentTime.set(this.internalCurrentTime)
    // this.runModel()

    this.currentStateIndex++
    const state = stateForIndex(this.currentStateIndex)
    // TODO: Use async runModel
    this.runModel(state)
    this.writableState.set(state)
  }

  public reset(): void {
    // let points: Point[] = []
    // for (let t = 0; t <= 100; t += 5) {
    //   points.push({ x: t, y: 0 })
    // }
    // points = []
    // currentTime = 0
    // currentValue = 0
    // appViewModel.writableLookupPoints.set(points)
    // appViewModel.writableStopAfterTime.set(currentTime)

    this.internalCurrentTime = 0
    this.writableCurrentTime.set(this.internalCurrentTime)

    this.currentStateIndex = 0
    const state = stateForIndex(this.currentStateIndex)
    this.runModel(state)
    this.writableState.set(state)
  }

  private updateGraphData(maxTime: number): void {
    const outputs = this.generatedModel.outputs
    // const lastIndex = this.internalCurrentTime + 1
    const dataChanged = this.writableDataChanged
    function updateData(graphViewModel: GraphViewModel) {
      for (const datasetSpec of graphViewModel.spec.datasets) {
        const series = outputs.getSeriesForVar(datasetSpec.varId)
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
    const lookupPoints: Point[] = []
    for (let t = 0; t <= 100; t += 5) {
      lookupPoints.push({ x: t, y: modelInputs.currentRate || 0 })
    }
    const lookups = [createLookupDef(this.generatedModel.dataVarSpec, lookupPoints)]

    const outputs = this.generatedModel.outputs
    this.generatedModel.runner.runModelSync(inputValues, outputs, {
      lookups
      // stopAfterTime: $stopAfterTime
    })

    const duration = 1000
    this.writableBusy.set(true)
    for (let i = 0; i <= duration; i += 20) {
      // TODO: Use minGraphTime here
      const animTimeInMonths = (i / duration) * state.maxGraphTime
      setTimeout(() => {
        this.updateGraphData(animTimeInMonths)
        if (i === duration) {
          this.writableBusy.set(false)
        }
      }, i)
    }

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

  // Parse the Vensim model
  const parsedModel = parseInlineVensimModel(mdlContent /*, opts?.modelDir*/)

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
      // // TODO: Set default data points for start and end times
      points.set(0, 0)
      // points.set(3, 2)
      // points.set(5, 1)
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

  // console.log(jsCode)

  // Parse the JSON listing to determine input and output variables
  const jsonListStr = getModelListing()
  // console.log(jsonListStr)
  const listingObj = JSON.parse(jsonListStr)
  const dataVars = []
  const inputVars = []
  const outputVars = []
  // console.log(listingObj.variables)
  for (const varInfo of listingObj.variables) {
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
      case 'data':
        dataVars.push(varInfo)
        break
      default:
        break
    }
  }

  return {
    jsCode,
    listing: new ModelListing(jsonListStr),
    dataVars,
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

function stateForIndex(stateIndex: number): AppState {
  let msg = ''
  let modelInputs: ModelInputs
  let minGraphTime: number
  let maxGraphTime: number

  switch (stateIndex) {
    case 0:
      msg += `Welcome to Alphaville.  In Alphaville, we make sure that everyone gets a house. `
      msg += `This takes some planning.`
      modelInputs = {
        avgLife: -1
      }
      minGraphTime = 0
      maxGraphTime = 0
      break
    case 1:
      msg += `In an ideal Alphaville, houses would never deteriorate, and the `
      msg += `<span class="supply">supply</span> of houses would be equal to the `
      msg += `<span class="demand">demand</span>.`
      modelInputs = {
        avgLife: Number.POSITIVE_INFINITY
      }
      minGraphTime = 0
      maxGraphTime = 100
      break
    case 2:
      msg += `In the real Alphaville, the average lifespan of a house is 50 years, so `
      msg += `if the town didn't plan for replacements, the <span class="supply">supply</span> `
      msg += `would fall as the houses deteriorate.`
      modelInputs = {
        avgLife: 600,
        currentRate: 0
      }
      minGraphTime = 0
      maxGraphTime = 100
      break
    case 3:
      msg += `Fortunately, the town's House Planner is smart and has figured out how to `
      msg += `plan for new houses at an ideal rate, so that the `
      msg += `<span class="supply">supply</span> remains steady to meet `
      msg += `<span class="demand">demand</span>.`
      modelInputs = {
        avgLife: 600,
        currentRate: 1.7,
        timeToPlan: 3,
        timeToBuild: 6,
        timeToRespond: 8
      }
      minGraphTime = 0
      maxGraphTime = 30
      break
    case 4:
      msg += `But suddenly, the House Planner has decided to retire, and the town `
      msg += `has assigned the role of House Planner to YOU.<br><br>`
      msg += `Every 5 months, you will decide the rate of house building.`
      modelInputs = {
        avgLife: 600,
        currentRate: 1.7,
        timeToPlan: 3,
        timeToBuild: 6,
        timeToRespond: 8
      }
      minGraphTime = 30
      maxGraphTime = 35
      break
    case 5:
      msg += `The biggest company in town has decided to double its workforce. `
      msg += `The town suddenly needs 500 more houses.<br><br>`
      msg += `Set a new rate to help close the gap between `
      msg += `<span class="supply">supply</span> and `
      msg += `<span class="demand">demand</span>.`
      modelInputs = {
        addlRequired: 500,
        avgLife: 600,
        currentRate: 1.7,
        timeToPlan: 3,
        timeToBuild: 6,
        timeToRespond: 8
      }
      minGraphTime = 35
      maxGraphTime = 40
      break
    default:
      if (stateIndex > 5) {
        msg += `Set a new rate to help close the gap between `
        msg += `<span class="supply">supply</span> and `
        msg += `<span class="demand">demand</span>.`
        modelInputs = {
          addlRequired: 500,
          avgLife: 600,
          currentRate: 2.5,
          timeToPlan: 3,
          timeToBuild: 6,
          timeToRespond: 8
        }
        minGraphTime = 40 + (stateIndex - 5) * 5
        maxGraphTime = minGraphTime + 5
      }
      break
  }

  return {
    message: msg,
    modelInputs: modelInputs,
    minGraphTime,
    maxGraphTime
  }
}

const mdl = `\
{UTF-8}
replacement houses = demolishing
  ~  house/Month
  ~    |

planning data ~~|

planning = planning data
  ~  house/Month
  ~ Originally: GAME( MAX( 0, replacement houses + (gap in houses / time to respond to gap)) )
  ~    |

average house life = 600
  ~  Month
  ~    |

building = Planned Houses / time to plan to build
  ~  house/Month
  ~    |

completing = Houses In Construction / time to build houses
  ~  house/Month
  ~    |

demolishing = Houses Completed / average house life
  ~  house/Month
  ~    |

gap in houses = (number of houses required - Houses Completed) * -1
  ~  house
  ~    |

Houses Completed = INTEG(+completing-demolishing, initial houses)
  ~  house
  ~    |

Houses In Construction = INTEG(building-completing, building * time to build houses)
  ~  house
  ~    |

initial houses = 1000
  ~  house
  ~    |

additional houses required at t 40 = 0
  ~  house
  ~    |

number of houses required =
   initial houses + STEP ( additional houses required at t 40, 40 )
  ~  house
  ~    |

Planned Houses = INTEG(+planning - building, planning * time to plan to build)
  ~  house
  ~    |

time to build houses = 6
  ~  Month
  ~    |

time to plan to build=
   3
  ~  Month
  ~    |

time to respond to gap=
   8
  ~  Month
  ~    |

********************************************************
  .Control
********************************************************~
    Simulation Control Paramaters
  |

FINAL TIME  = 100
  ~  Month
  ~    The final time for the simulation.
  |

INITIAL TIME  = 0
  ~  Month
  ~    The initial time for the simulation.
  |

SAVEPER  = 1
  ~  Month
  ~    The frequency with which output is stored.
  |

TIME STEP  = 0.5
  ~  Month
  ~    The time step for the simulation.
  |
`
