import $ from 'jquery'
import Slider from 'bootstrap-slider'
import 'bootstrap-slider/dist/css/bootstrap-slider.css'

import { createModel } from '@core'
import enStrings from '@core-strings/en'

let coreConfig
let model
let modelContext
let graphView

/**
 * Return the base (English) string for the given key.
 */
function str(key) {
  return enStrings[key]
}

/*
 * INPUTS
 */

function addSliderItem(sliderInput) {
  const spec = sliderInput.spec
  const inputElemId = `input-${spec.id}`

  const div = $(`<div class="input-item"/>`).append([
    $(`<div class="input-title">${str(spec.labelKey)}</div>`),
    $(`<input id="${inputElemId}" class="slider" type="text"></input>`),
    $(`<div class="input-desc">${str(spec.descriptionKey)}</div>`)
  ])

  $('#inputs-content').append(div)

  const slider = new Slider(`#${inputElemId}`, {
    value: sliderInput.get(),
    min: spec.minValue,
    max: spec.maxValue,
    step: spec.step,
    reversed: spec.reversed,
    tooltip: 'hide'
  })

  // Update the model input when the slider is dragged or the track is clicked
  slider.on('change', change => {
    sliderInput.set(change.newValue)
  })
}

function addSwitchItem(switchInput) {
  const spec = switchInput.spec

  const inputElemId = `input-${spec.id}`

  function addCheckbox(desc) {
    // Exercise for the reader: gray out and disable sliders that are inactive
    // when this checkbox is checked
    const div = $(`<div class="input-item"/>`).append([
      $(`<input id="${inputElemId}" class="switch-checkbox" name="${inputElemId}" type="checkbox"/>`),
      $(`<label for="${inputElemId}" class="switch-label">${str(spec.labelKey)}</label>`),
      $(`<div class="input-desc">${desc}</div>`)
    ])
    $('#inputs-content').append(div)
    $(`#${inputElemId}`).on('change', function () {
      if ($(this).is(':checked')) {
        switchInput.set(spec.onValue)
      } else {
        switchInput.set(spec.offValue)
      }
    })
  }

  if (!spec.slidersActiveWhenOff && spec.slidersActiveWhenOn) {
    // This is a switch that controls whether the slider that follows it is active
    addCheckbox('The following slider will have an effect only when this is checked.')
    for (const sliderId of spec.slidersActiveWhenOn) {
      const slider = modelContext.getInputForId(sliderId)
      addSliderItem(slider)
    }
  } else {
    // This is a detailed settings switch; when it's off, the sliders above it
    // are active and the sliders below are inactive (and vice versa)
    for (const sliderId of spec.slidersActiveWhenOff) {
      const slider = modelContext.getInputForId(sliderId)
      addSliderItem(slider)
    }
    addCheckbox(
      'When this is unchecked, only the slider above has an effect, and the ones below are inactive (and vice versa).'
    )
    for (const sliderId of spec.slidersActiveWhenOn) {
      const slider = modelContext.getInputForId(sliderId)
      addSliderItem(slider)
    }
  }
}

function showInputs() {}

/**
 * Initialize the UI for the inputs menu and panel.
 */
function initInputsUI() {
  $('#inputs-content').empty()
  for (const inputId of coreConfig.inputIds) {
    const input = modelContext.getInputForId(inputId)
    if (input.kind === 'slider') {
      addSliderItem(input)
    } else if (input.kind === 'switch') {
      addSwitchItem(input)
    }
  }
}

/*
 * GRAPHS
 */

// function createGraphViewModel(graphSpec) {
//   return {
//     spec: graphSpec,
//     style: 'normal',
//     getLineWidth: () => window.innerWidth * (0.5 / 100),
//     getScaleLabelFontSize: () => window.innerWidth * (1.2 / 100),
//     getAxisLabelFontSize: () => window.innerWidth * (1.0 / 100),
//     getSeriesForVar: (varId, sourceName) => {
//       return modelContext.getSeriesForVar(varId, sourceName)
//     },
//     getStringForKey: key => {
//       // TODO: Inject values if string is templated
//       return str(key)
//     },
//     formatYAxisTickValue: value => {
//       // TODO: Can use d3-format here and pass graphSpec.yFormat
//       const stringValue = value.toFixed(1)
//       if (graphSpec.kind === 'h-bar' && graphSpec.id !== '142') {
//         // For bar charts that display percentages, format as a percent value
//         return `${stringValue}%`
//       } else {
//         // For all other cases, return the string value without units
//         return stringValue
//       }
//     },
//     formatYAxisTooltipValue: value => {
//       // TODO: Can use d3-format here and pass '.2~f', for example
//       return value.toFixed(2)
//     }
//   }
// }

function showGraph(graphSpec) {
  if (graphView) {
    // Destroy the old view before switching to a new one
    graphView.destroy()
  }

  const canvas = $('#top-graph-canvas')[0]
  const viewModel = createGraphViewModel(graphSpec)
  const options = {
    fontFamily: 'Helvetica, sans-serif',
    fontStyle: 'bold',
    fontColor: '#231f20'
  }
  const tooltipsEnabled = true
  const xAxisLabel = graphSpec.xAxisLabelKey ? str(graphSpec.xAxisLabelKey) : undefined
  const yAxisLabel = graphSpec.yAxisLabelKey ? str(graphSpec.yAxisLabelKey) : undefined
  graphView = new GraphView(canvas, viewModel, options, tooltipsEnabled, xAxisLabel, yAxisLabel)
}

function addGraphItem(graphSpec) {
  const title = str(graphSpec.menuTitleKey || graphSpec.titleKey)
  const option = $(`<option value="${graphSpec.id}">${title}</option>`).data(graphSpec)
  $('#graph-selector').append(option)
}

/**
 * Initialize the UI for the graphs panel.
 */
function initGraphsUI() {
  // Add the graph selector options
  for (const spec of coreConfig.graphs.values()) {
    addGraphItem(spec)
  }

  // When a graph item is selected, show that graph
  $('select').on('change', function () {
    const graphId = this.value
    const graphSpec = coreConfig.graphs.get(graphId)
    showGraph(graphSpec)
  })

  // Select the first graph by default
  showGraph(coreConfig.graphs.values().next().value)
}

/*
 * INITIALIZATION
 */

/**
 * Initialize the web app.  This will load the wasm model asynchronously,
 * and upon completion will initialize the user interface.
 */
async function initApp() {
  // Initialize the model asynchronously
  try {
    model = await createModel()
    modelContext = model.addContext()
  } catch (e) {
    console.error(`ERROR: Failed to load model: ${e.message}`)
    return
  }

  // Initialize the user interface
  initInputsUI()
  initGraphsUI()

  // When the model outputs are updated, refresh the graph
  modelContext.onOutputsChanged(() => {
    if (graphView) {
      graphView.updateData()
    }
  })
}

// Initialize the app when this script is loaded
initApp()
