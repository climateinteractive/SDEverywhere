const R = require('ramda')
const { inputVarNames, viewConfig } = require('./model_config')
const log = require('./log')

// Data storage for input variables
let inputData = new Map()
// Default data from the model baseline
let defaultData = new Map()

let setDefaultInputValues = () => {
  // Compile default input values across all views.
  // TODO Read baseline values for input variables from the model.
  let findDefaultValue = varName => {
    // Find the first view that contains this input variable and use its value.
    for (let viewId in viewConfig) {
      let view = viewConfig[viewId]
      if (view.sliders) {
        for (let slider of view.sliders) {
          if (slider) {
            if (slider.name === varName && typeof slider.value !== 'undefined') {
              return slider.value
            }
          } else {
            console.error(`null slider in view ${view.title}`)
          }
        }
      }
    }
    // The "default default value" is zero.
    return 0
  }
  // Build the default data map with input vars in order.
  for (let varName of inputVarNames) {
    defaultData.set(varName, findDefaultValue(varName))
  }
}
let resetInputs = () => {
  inputData = new Map(defaultData)
}
let formatInputs = () => {
  // Serialize all input values indexed by inputVarNames index number.
  let a = []
  let i = 0
  for (let value of inputData.values()) {
    a.push(`${i++}:${value}`)
  }
  return a.join(' ')
}
// let getInputValue = varName => inputData.get(varName) || 0
let getInputValue = varName => {
  let value = inputData.get(varName)
  return value
}
let setInputValue = (varName, value) => {
  if (R.contains(varName, inputVarNames)) {
    inputData.set(varName, value)
  }
}

module.exports = {
  setDefaultInputValues,
  resetInputs,
  formatInputs,
  getInputValue,
  setInputValue
}
