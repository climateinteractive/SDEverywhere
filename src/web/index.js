// Third-party modules
const num = require('numbro')
const he = require('he')
const R = require('ramda')
// Application modules
const { app, appMenu, viewConfig } = require('./model_config')
const { setNumCharts, setChartData, createChart, createCharts, updateCharts, destroyChart } = require('./charts')
const modelRun = require('./model_run')
const { setDefaultInputValues, resetInputs, formatInputs, getInputValue, setInputValue } = require('./model_data')
const uiConfig = require('./ui_config')
const { str } = require('./ui_config')
const log = require('./log')

// Debounce interval for window resizing in ms
const DEBOUNCE_INTERVAL = 250
// Keycodes for key events
const ENTER_KEYCODE = 13
const ESC_KEYCODE = 27
// Chart indices
const NUM_CHARTS = 2
const LEFT_CHART = 0
const RIGHT_CHART = 1
// Bootstrap column classes
const CHART_COL_CLASSES = ['.col-xs-6', '.col-xs-6']
// Bootstrap horizontal column padding
const COL_PADDING = 15
// Input cell horizontal padding and margin from the style sheet
const CELL_PADDING = 12
const CELL_MARGIN = 6
// Input panel height as a fraction of window height
const INPUT_PANEL_HEIGHT = 0.4
// Number of sliders in an input panel row
const NUM_INPUT_COLS = 5
// Relative size of the units font to the value font.
const UNITS_FONT_SCALE = 0.75

// Data buffers for the model
let inputs = ''
let outputs = ''

// App state
let currentViewId = app.initialView
let currentChartIds = R.clone(viewConfig[currentViewId].chartIds)
let runStartTime

// Initial UI configuration
let startup = () => {
  logEnvironment()
  setNumCharts(NUM_CHARTS)
  setLanguage('EN')
  setTitle()
  buildAppMenu()
  setDefaultInputValues()
  resetInputs()
  runModel(() => {
    setChartData('create', outputs, currentChartIds)
    setPanelSizes()
    buildInputPanel()
    createCharts()
  })
}

// Model interface
let runModel = continuation => {
  inputs = formatInputs()
  // log(`inputs = "${inputs}"`)
  runStartTime = performance.now()
  modelRun.run(inputs).then(data => {
    outputs = data
    let runEndTime = performance.now()
    log(`run time = ${num(runEndTime - runStartTime).format('0')} ms`)
    continuation()
  })
}
let selectView = viewId => {
  log(`selectView: ${str(viewId)}`)
  // Destroy charts first, since a view may not have charts.
  let chartIds = viewConfig[currentViewId].chartIds
  for (let iChart = 0; iChart < chartIds.length; iChart++) {
    destroyChart(iChart)
    currentChartIds = []
  }
  let oldViewHadCharts = chartIds.length > 0
  // Switch to the new view.
  currentViewId = viewId
  chartIds = viewConfig[currentViewId].chartIds
  let newViewHasCharts = chartIds.length > 0
  if (oldViewHadCharts && !newViewHasCharts) {
    $('#chartSection').hide()
  } else if (!oldViewHadCharts && newViewHasCharts) {
    $('#chartSection').show()
  }
  setNumCharts(chartIds.length)
  $('.appTitle').text(str(currentViewId))
  for (let iChart = 0; iChart < chartIds.length; iChart++) {
    currentChartIds[iChart] = chartIds[iChart]
    setChartData('create', outputs, currentChartIds, iChart)
    createChart(iChart)
  }
  buildInputPanel()
}
let setPanelSizes = () => {
  // Calculate panel sizes based on Bootstrap grid classes and element placements.
  let clientHeight = window.innerHeight
  let leftWidth = $(CHART_COL_CLASSES[LEFT_CHART]).outerWidth() - COL_PADDING * 2
  let rightWidth = $(CHART_COL_CLASSES[RIGHT_CHART]).outerWidth() - COL_PADDING * 2
  let windowPadding = $('#canvas0').offset().top
  let legendHeight = $('#legend0').outerHeight()
  let lowerHeight = clientHeight * INPUT_PANEL_HEIGHT
  // Destroy the charts before rebuilding them on resized canvas elements.
  for (let iChart = 0; iChart < NUM_CHARTS; iChart++) {
    destroyChart(iChart)
  }
  // Set the canvas size using the special pixel-only HTMLCanvasElement.width and height properties.
  let canvasHeight = clientHeight - (1.5 * windowPadding + legendHeight + lowerHeight)
  let c = document.getElementById('canvas0')
  c.width = leftWidth
  c.height = canvasHeight
  c = document.getElementById('canvas1')
  c.width = rightWidth
  c.height = canvasHeight
  // Set the legend width to match the canvas width.
  $('#legend0').css('width', `${leftWidth}px`)
  $('#legend1').css('width', `${rightWidth}px`)
}
let resizeWindow = () => {
  log(`resizeWindow to ${window.innerWidth} x ${window.innerHeight}`)
  setPanelSizes()
  setInputFontSizes()
  createCharts()
}
let resizeTimeout
window.addEventListener(
  'resize',
  () => {
    // Debounce the resize event to only after the last movement.
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(resizeWindow, DEBOUNCE_INTERVAL)
  },
  false
)

// Menu commands
let openBrowserWindow = url => {
  window.open(url, '_blank')
}
let helpUsing = () => {
  if (app.help_url) {
    openBrowserWindow(app.help_url)
  }
}
let resetSim = () => {
  // Reset the input data to default values.
  resetInputs()
  showSliderValues()
  // Run the model with the new inputs.
  runModel(() => {
    setChartData('update', outputs, currentChartIds)
    updateCharts()
  })
}
// Menu command dispatch
let commandFunction = commandId => {
  switch (commandId) {
    // Simulation
    case 'reset_sim':
      return resetSim
    // Help
    case 'help_using':
      return helpUsing
    default:
      // Show a chart if it the commandId is a graph id.
      if (commandId in viewConfig) {
        return () => selectView(commandId)
      } else {
        // log(`command id ${commandId} not found`)
        return null
      }
  }
}
let setLanguage = language => {
  // Select localized config resources.
  // log(`setLanguage ${language}`)
  uiConfig.setLanguage(language)
  let cultures = { EN: 'en-US' }
  num.culture(cultures[language])
}
let setTitle = () => {
  if (app.title) {
    let title = str(app.title)
    if (title) {
      $('title').text(title)
    }
  }
}
let buildAppMenu = () => {
  // The language must be set with setLanguage first.
  let menuItemLabel = (menuItem, decodeEntities = false) => {
    let label = ''
    if (R.has('label', menuItem)) {
      label = str(menuItem.label)
    } else if (R.has('id', menuItem)) {
      label = str(menuItem.id)
    }
    if (decodeEntities) {
      label = he.decode(label)
    }
    return label
  }
  // Compose HTML for menu elements.
  let html = `<li class="appLogo"><img src="${app.logo}" alt=""></li>`
  let radioGroup = 0
  let configureSubmenu = (menuItem, secondLevel = false) => {
    let inRadioGroup = false
    if (secondLevel) {
      html += '<li class="dropdown-submenu">'
      html += `<a id="${menuItem.id}">${menuItemLabel(menuItem)} <i class="fa fa-caret-right"></i></a>`
    } else {
      html += '<li role="presentation" class="dropdown">'
      html += `<a class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false" id="${
        menuItem.id
      }">${menuItemLabel(menuItem)} <span class="caret"></span></a>`
    }
    html += '<ul class="dropdown-menu">'
    for (let subMenuItem of menuItem.submenu) {
      if (subMenuItem.submenu) {
        configureSubmenu(subMenuItem, true)
      } else if (subMenuItem.id) {
        let label = menuItemLabel(subMenuItem)
        // Add the checkbox character to all menu items so they line up with radio menu items.
        if (label !== '') {
          label = `${label}`
        }
        if (subMenuItem.type === 'radio') {
          if (!inRadioGroup) {
            inRadioGroup = true
            radioGroup += 1
          }
          html += `<li class="radio-group-${radioGroup}"><a id="${subMenuItem.id}">${label}</a></li>`
        } else {
          html += `<li><a id="${subMenuItem.id}">${label}</a></li>`
          inRadioGroup = false
        }
      } else if (subMenuItem.label) {
        // Show a non-clickable label that has already been expanded into localized text.
        html += `<li class="disabled"><a>${subMenuItem.label}</a></li>`
        inRadioGroup = false
      } else if (subMenuItem.type === 'separator') {
        html += '<li role="separator" class="divider"></li>'
        inRadioGroup = false
      }
    }
    html += '</ul>'
    html += '</li>'
  }
  for (let appMenuItem of appMenu) {
    configureSubmenu(appMenuItem)
  }
  html += `<li class="appTitle">${str(currentViewId)}</li>`
  $('ul.nav.nav-tabs').html(html)
  // Add click event handlers on the new menu item elements.
  $('ul.dropdown-menu > li > a').each(function() {
    let id = $(this).attr('id')
    let clickHandler = commandFunction(id)
    if (clickHandler) {
      $(this).click(clickHandler)
    }
  })
}
// Input panel
let valueId = name => `${name.replace(/\[/g, '_').replace(/\]/g, '_')}_value`
let unitsId = name => `${name.replace(/\[/g, '_').replace(/\]/g, '_')}_units`
let buildInputPanel = () => {
  // Build the input panel with localized strings.
  let col = 0
  let isFirstCol = () => col === 0
  let isLastCol = () => col >= NUM_INPUT_COLS - 1
  let html = '<table>'
  let sliders = viewConfig[currentViewId].sliders
  if (sliders) {
    for (let slider of sliders) {
      if (isFirstCol()) {
        html += '<tr>'
      }
      let panelClass = 'sliderPanel'
      if (isFirstCol()) {
        panelClass += ' firstSlider'
      }
      if (isLastCol()) {
        panelClass += ' lastSlider'
      }
      html += '<td>'
      // Empty slider objects indicate a blank cell in the input panel.
      if (!R.isEmpty(slider)) {
        html += `<div class="${panelClass}">`
        html += `<label class="sliderLabel" for="${slider.name}">${str(slider.label)}</label><br>`
        html += `<input type="range" id="${slider.name}" min="${slider.minValue}" max="${slider.maxValue}" step="${slider.step}">`
        html += `<span class="sliderValue" id="${valueId(slider.name)}"></span>`
        html += `<span class="sliderUnits" id="${unitsId(slider.name)}"></span>`
        html += '</div>'
      }
      html += '</td>'
      if (isLastCol()) {
        html += '</tr>'
        col = 0
      } else {
        ++col
      }
    }
  }
  if (!isFirstCol()) {
    // Fill in remaining table cells in this row.
    while (col < NUM_INPUT_COLS) {
      html += '<td>&nbsp;</td>'
      col++
    }
    html += '</tr>'
  }
  html += '</table>'
  $('#inputPanel').html(html)
  showSliderValues()
  setInputFontSizes()
}
let setInputFontSizes = () => {
  // Set font sizes for slider labels and units to fit the available horizontal space.
  let sliders = viewConfig[currentViewId].sliders
  if (sliders) {
    // Find the longest label and unit strings.
    let labelMetrics = textMetrics(document.querySelector('.sliderLabel'))
    let maxLabelWidth = R.reduce((m, slider) => R.max(m, labelMetrics.width(str(slider.label))), 0, sliders)
    let pxFontSize = sel => {
      let result = 0
      let el = $(sel)
      if (el && el.length > 0) {
        let size = el.css('font-size').replace('px', '')
        result = Number.parseFloat(size)
      }
      return result
    }
    let cellWidth = $('.sliderPanel').outerWidth() - 2 * CELL_MARGIN - 2 * CELL_PADDING
    log(`cellWidth = ${cellWidth}`)
    let labelFontSize = pxFontSize('.sliderLabel')
    // Reduce the font size to fit.
    labelFontSize *= cellWidth / maxLabelWidth
    let labelFontSizeCss = `${labelFontSize.toFixed(2)}px`
    log(`labelFontSize = ${labelFontSizeCss}`)
    $('.sliderLabel').css('font-size', labelFontSizeCss)
    $('.sliderValue').css('font-size', labelFontSizeCss)
    let unitsFontSizeCss = `${(labelFontSize * UNITS_FONT_SCALE).toFixed(2)}px`
    $('.sliderUnits').css('font-size', unitsFontSizeCss)
  }
}
let showInputValue = varName => {
  let slider = R.find(R.propEq('name', varName), viewConfig[currentViewId].sliders)
  if (slider && !R.isEmpty(slider)) {
    // Set the value on the range control.
    let value = getInputValue(slider.name)
    $(`#${slider.name}`).val(value)
    // Set the value in the label under the slider.
    let format = slider.format || '0'
    let valueText = num(value).format(format)
    $(`#${valueId(slider.name)}`).text(valueText)
  }
}
let showInputUnits = varName => {
  let slider = R.find(R.propEq('name', varName), viewConfig[currentViewId].sliders)
  if (slider && !R.isEmpty(slider) && slider.units) {
    // Set the units in the label under the slider.
    let unitsText = ` ${str(slider.units)}`
    $(`#${unitsId(slider.name)}`).text(unitsText)
  }
}
let showSliderValues = () => {
  let sliders = viewConfig[currentViewId].sliders
  if (sliders) {
    for (let slider of sliders) {
      showInputValue(slider.name)
      showInputUnits(slider.name)
    }
  }
}
let runOnInput = () => {
  runModel(() => {
    if (currentChartIds.length > 0) {
      setChartData('update', outputs, currentChartIds)
      updateCharts()
    }
  })
}
$('#inputPanel').on('input', e => {
  // Update the setting and value label by tracking the slider.
  // Numbers from the slider are always in the EN locale.
  let value = parseFloat(e.target.value)
  setInputValue(e.target.id, value)
  showInputValue(e.target.id)
  if (app.trackSliders) {
    runOnInput()
  }
})
$('#inputPanel').change(e => {
  // Run the model when the slider movement is complete.
  if (!app.trackSliders) {
    runOnInput()
  }
})
// Helpers
let logEnvironment = () => {
  log(`window size ${window.innerWidth} x ${window.innerHeight}`)
}

// Start after the model runtime is initialized.
// The Module object is defined in window so that browserify makes it global.
window.Module = {
  preRun: [],
  postRun: [],
  onRuntimeInitialized: () => startup()
}
