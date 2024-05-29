export interface ModelInputs {
  addlRequired?: number
  avgLife?: number
  currentRate?: number
  useRateFromUser?: boolean
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

export function stateForIndex(stateIndex: number): AppState {
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
      if (stateIndex >= 6) {
        msg += `Set a new rate to help close the gap between `
        msg += `<span class="supply">supply</span> and `
        msg += `<span class="demand">demand</span>.`
        modelInputs = {
          addlRequired: 500,
          avgLife: 600,
          useRateFromUser: true,
          timeToPlan: 3,
          timeToBuild: 6,
          timeToRespond: 8
        }
        minGraphTime = 40 + (stateIndex - 6) * 5
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

export function inputValuesForState(state: AppState): number[] {
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

  return inputValues
}
