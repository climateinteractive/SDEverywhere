#!/usr/bin/env node
const fs = require('fs-extra')
const path = require('path')
const R = require('ramda')
const parseCsv = require('csv-parse/lib/sync')
const byline = require('byline')
const B = require('bufx')
const { canonicalName, strings, stringToId, matchRegex } = require('./Helpers')

let cfg, inputVarNames, outputVarNames, chartVarnames, chartDatfiles
let configDirname, specPathname, cfgPathname, stringsPathname, chartDataPathname, datDirname

const CONFIG_FILES = ['app.csv', 'colors.csv', 'graphs.csv', 'sliders.csv', 'views.csv']
const CSV_PARSE_OPTS = { columns: true, trim: true, skip_empty_lines: true, skip_lines_with_empty_values: true }
const MAX_PLOTS = 8

let initConfig = (modelDir, webDir) => {
  configDirname = path.join(modelDir, 'config')
  datDirname = modelDir
  specPathname = path.join(modelDir, 'app_spec.json')
  if (webDir) {
    cfgPathname = path.join(webDir, 'appcfg.js')
    stringsPathname = path.join(webDir, 'strings.js')
    chartDataPathname = path.join(webDir, 'chart_data.js')
  }
  cfg = {}
  inputVarNames = []
  outputVarNames = []
  chartVarnames = {}
  chartDatfiles = {}
  parseCfg()
  getVarNames()
}
let parseCfg = () => {
  // Parse each CSV file in the config directory and add it to the cfg object.
  for (const filename of CONFIG_FILES) {
    let cfgSection = filename.replace('.csv', '')
    let pathname = path.join(configDirname, filename)
    try {
      let data = B.read(pathname)
      let obj = parseCsv(data, CSV_PARSE_OPTS)
      if (cfgSection === 'app') {
        cfg.app = obj[0]
        cfg.app.startTime = num(val(cfg.app.startTime))
        cfg.app.endTime = num(val(cfg.app.endTime))
        cfg.app.initialTime = num(val(cfg.app.initialTime))
      } else {
        cfg[cfgSection] = obj
      }
    } catch (error) {
      console.error(`ERROR: config file ${pathname} not found`)
    }
  }
}
let getVarNames = () => {
  // Compile a list of input and output variable names.
  for (let slider of cfg.sliders) {
    inputVarNames.push(slider.varName)
  }
  for (const graph of cfg.graphs) {
    for (let plotNum = 1; plotNum <= MAX_PLOTS; plotNum++) {
      let varName = graph[`plot${plotNum}Variable`]
      if (varName) {
        outputVarNames.push(varName)
      }
    }
  }
  inputVarNames = B.sortu(R.map(name => canonicalName(name), inputVarNames))
  outputVarNames = B.sortu(R.map(name => canonicalName(name), outputVarNames))
  outputVarNames.unshift('_time')
}
let emitConsts = () => {
  exportObj('TIME_VAR_NAME', '_time')
}
let emitApp = () => {
  let app = {}
  app.title = stringToId(cfg.app.title)
  app.logo = cfg.app.logo
  app.version = cfg.app.version
  app.helpUrl = cfg.app.helpUrl
  app.initialView = stringToId(cfg.app.initialView)
  app.trackSliders = !!cfg.app.trackSliders
  app.colors = {}
  for (const color of cfg.colors) {
    app.colors[`color_${color.colorId}`] = color.hexCode
  }
  exportObj('app', app)
}
let emitVars = () => {
  exportObj('inputVarNames', inputVarNames)
  exportObj('outputVarNames', outputVarNames)
}
let emitMenu = () => {
  // Compile a menu specification, with up to two levels. For example:
  // [
  //   {
  //     id: 'simulation',
  //     submenu: [
  //       {id: 'default_graphs'},
  //       {type: 'separator'},
  //       {
  //         id: 'fossil_fuel_emissions',
  //         submenu: [
  //           {id: 'global_fossil_fuel_emissions'},
  //           {id: 'cumulative_global_fossil_fuel_co2_emissions_as_co2'}
  //         ]
  //       }
  //     ]
  //   }
  // ]
  // TODO handle 1D case
  let appMenu = []
  let topLevelMenu = {}
  let toplevelSubmenu = []
  let sectionMenu = {}
  let sectionSubmenu = []
  // Simulation menu
  topLevelMenu = { id: stringToId('Simulation') }
  toplevelSubmenu = [
    {
      label: stringToId('Reset'),
      id: 'reset_sim'
    },
    { type: 'separator' }
  ]
  let sectionTitle = ''
  for (const view of cfg.views) {
    let section = viewTitleSection(view.title)
    if (section && section !== sectionTitle) {
      sectionTitle = section
      sectionMenu = {}
      sectionSubmenu = []
      sectionMenu.id = stringToId(sectionTitle)
    }
    let viewId = stringToId(view.title)
    sectionSubmenu.push({ id: viewId, label: stringToId(viewTitleName(view.title)) })
    sectionMenu.submenu = sectionSubmenu
    toplevelSubmenu.push(sectionMenu)
  }
  topLevelMenu.submenu = toplevelSubmenu
  appMenu.push(topLevelMenu)
  // Help menu
  if (cfg.app.version || (cfg.app.helpUrl && cfg.app.title)) {
    topLevelMenu = { id: stringToId('Help') }
    toplevelSubmenu = []
    if (cfg.app.version) {
      toplevelSubmenu.push({
        label: `Version ${cfg.app.version}`,
        enabled: false
      })
    }
    if (cfg.app.helpUrl && cfg.app.title) {
      if (!R.isEmpty(toplevelSubmenu)) {
        toplevelSubmenu.push({ type: 'separator' })
      }
      toplevelSubmenu.push({
        label: stringToId(`About ${cfg.app.title}`),
        id: 'help_using'
      })
    }
    topLevelMenu.submenu = toplevelSubmenu
    appMenu.push(topLevelMenu)
  }
  exportObj('appMenu', appMenu)
}
let emitCharts = () => {
  let value
  let chartConfig = {}
  for (const graph of cfg.graphs) {
    let chart = {}
    chart.title = stringToId(graph.title)
    if (val(graph.xAxisMin) && val(graph.xAxisMax)) {
      chart.xMin = num(val(graph.xAxisMin))
      chart.xMax = num(val(graph.xAxisMax))
    } else {
      console.error(`warning: the ${graph.title} graph does not have x axis min and max`)
    }
    if (val(graph.yAxisMax)) {
      chart.yMin = num(val(graph.yAxisMin, 0))
      chart.yMax = num(val(graph.yAxisMax))
      chart.yAxisLabel = stringToId(graph.yAxisUnits)
      chart.yFormat = val(graph.yAxisFormat, '0')
    } else {
      console.error(`warning: the ${graph.title} graph does not have y axis max`)
    }
    chart.varNames = []
    chart.xAxisLabels = []
    chart.colors = []
    chart.lineStyle = []
    chart.datasets = []
    for (let plotNum = 1; plotNum <= MAX_PLOTS; plotNum++) {
      let prefix = `plot${plotNum}`
      let key = `${prefix}Variable`
      if (graph[key]) {
        value = canonicalName(graph[key])
        chart.varNames.push(value)

        key = `${prefix}Label`
        value = stringToId(graph[key])
        chart.xAxisLabels.push(value)

        key = `${prefix}Color`
        if (colorForId(graph[key])) {
          value = `color_${graph[key]}`
        } else {
          console.error(`warning: the ${graph.title} graph color ${graph[key]} does not exist`)
        }
        chart.colors.push(value)

        key = `${prefix}Style`
        value = val(graph[key], 'line').toLowerCase()
        chart.lineStyle.push(value)

        key = `${prefix}Dataset`
        value = val(graph[key])
        chart.datasets.push(value)
      } else {
        break
      }
    }
    chartConfig[chart.title] = chart
  }
  exportObj('chartConfig', chartConfig)

  // Compile a list of chart varnames to load from external data.
  for (const chartId in chartConfig) {
    let chart = chartConfig[chartId]
    for (let i = 0; i < chart.datasets.length; i++) {
      let dataset = chart.datasets[i]
      if (dataset) {
        if (!chartVarnames[dataset]) {
          chartVarnames[dataset] = []
        }
        chartVarnames[dataset].push(chart.varNames[i])
      }
    }
  }
  for (const dataset in chartVarnames) {
    chartVarnames[dataset] = B.sortu(chartVarnames[dataset])
  }
}
let emitViews = () => {
  // View titles may have a "section" indicated as "{section} > {view}". This groups related views
  // in the app menu. Views in a section may also share the same sliders by giving the section name
  // as the view title in sliders config.
  let viewConfig = {}
  for (let view of cfg.views) {
    let appView = { title: stringToId(view.title), chartIds: [], sliders: [] }
    let addGraph = graphTitle => {
      if (graphTitle) {
        if (R.find(R.propEq('title', graphTitle), cfg.graphs)) {
          appView.chartIds.push(stringToId(graphTitle))
        } else {
          console.error(`warning: view "${view.title}" graph "${graphTitle}" does not exist`)
        }
      }
    }
    addGraph(view.leftGraph)
    addGraph(view.rightGraph)
    // Find sliders with a view title that matches this view title or section.
    let section = viewTitleSection(view.title)
    for (const slider of cfg.sliders) {
      if (slider.viewTitle === view.title || slider.viewTitle === section) {
        let viewSlider = {
          name: canonicalName(slider.varName),
          label: stringToId(slider.label),
          value: num(val(slider.sliderDefault)),
          minValue: num(val(slider.sliderMin)),
          maxValue: num(val(slider.sliderMax)),
          step: num(val(slider.sliderStep)),
          units: stringToId(slider.units),
          format: val(slider.format)
        }
        appView.sliders.push(viewSlider)
      }
    }
    viewConfig[appView.title] = appView
  }
  exportObj('viewConfig', viewConfig)
}
let emitStrings = () => {
  let stringMap = {}
  for (let i = 0; i < strings.length; i++) {
    let id = `id${i}`
    stringMap[id] = { EN: strings[i] }
  }
  let js = `module.exports = ${JSON.stringify(stringMap)}`
  B.emitJs(js)
}
let emitSpec = currentSpec => {
  let spec = {}
  if (cfg.app.title) {
    spec.name = cfg.app.title
  }
  if (cfg.app.externalDatfiles) {
    spec.externalDatfiles = cfg.app.externalDatfiles.split(',')
  }
  if (cfg.app.chartDatfiles) {
    // Map datasets to dat filenames for later reference.
    for (const datfile of cfg.app.chartDatfiles.split(',')) {
      let dataset = path.basename(datfile, '.dat')
      chartDatfiles[dataset] = datfile
    }
    spec.chartDatfiles = chartDatfiles
  }
  spec.inputVars = inputVarNames
  spec.outputVars = outputVarNames
  for (const key in currentSpec) {
    if (!spec[key]) {
      spec[key] = currentSpec[key]
    }
  }
  B.emitPrettyJson(spec)
}
let makeModelSpec = () => {
  // Read an existing spec file to pick up and maintain extra properties.
  let currentSpec = {}
  try {
    let json = B.read(specPathname)
    currentSpec = JSON.parse(json)
  } catch (e) {}
  try {
    // Write app_spec.json
    B.clearBuf()
    emitSpec(currentSpec)
    B.writeBuf(specPathname)
    return specPathname
  } catch (e) {
    console.error(e.message)
    console.error(e.stack)
  }
}
let makeModelConfig = () => {
  try {
    // Write appcfg.js
    B.clearBuf()
    emitConsts()
    emitApp()
    emitVars()
    emitMenu()
    emitCharts()
    emitViews()
    B.writeBuf(cfgPathname)
    // Write strings.js
    B.clearBuf()
    emitStrings()
    B.writeBuf(stringsPathname)
    return [cfgPathname, stringsPathname]
  } catch (e) {
    console.error(e.message)
    console.error(e.stack)
  }
}
let makeChartData = async () => {
  // Read the dat files given in graph config and extract data to a JS file.
  // Skip this if the chart_data.js file already exists, since it normally only needs
  // to be created when the model changes, when we do a clean and rebuild.
  try {
    // Write chart_data.js
    B.clearBuf()
    let root = {}
    for (const dataset in chartVarnames) {
      root[dataset] = await readChartDat(dataset)
    }
    let js = `module.exports = ${JSON.stringify(root)}`
    B.emitJs(js)
    B.writeBuf(chartDataPathname)
  } catch (e) {
    console.error(e.message)
    console.error(e.stack)
  }
}
let readChartDat = async dataset => {
  // Read a Vensim DAT file with reference data for a chart into a Map.
  // Key: variable name in canonical format
  // Value: Map from numeric time value to numeric variable value
  let log = {}
  let varName = ''
  let varValues = []
  let lineNum = 1
  let initialValue = 0
  let splitDatLine = line => {
    const f = line.split('\t').map(s => s.trim())
    if (f.length < 2 || !R.isEmpty(f[1])) {
      return f
    } else {
      return [f[0]]
    }
  }
  let addValues = () => {
    if (varName !== '') {
      // Only save vars in the list of external varnames for this dataset.
      if (chartVarnames[dataset].includes(varName)) {
        // A constant has a single value at the initial year. If it is  earlier than than the start year for graphs,
        // there will not be any data in varValues. Emit the single value at the start year.
        if (R.isEmpty(varValues)) {
          varValues = [{ x: cfg.app.startTime, y: initialValue }]
        }
        log[varName] = varValues
      }
    }
  }
  let datfile = chartDatfiles[dataset]
  let datPathname = path.join(datDirname, datfile)
  return new Promise(resolve => {
    let stream = byline(fs.createReadStream(datPathname, 'utf8'))
    stream.on('data', line => {
      let values = splitDatLine(line)
      if (values.length === 1) {
        // Lines with a single value are variable names that start a data section.
        // Save the values for the current var if we are not on the first one.
        addValues()
        // Start a new map for this var.
        varName = canonicalName(values[0])
        varValues = []
      } else if (values.length > 1) {
        // Data lines in Vensim DAT format have {time}\t{value} format with optional comments afterward.
        let t = B.num(values[0])
        let value = B.num(values[1])
        // Save the value at time t in the varValues array if it is in the range we are graphing.
        if (Number.isNaN(t)) {
          console.error(`DAT file ${pathname}:${lineNum} time value is NaN`)
        } else if (Number.isNaN(value)) {
          console.error(`DAT file ${pathname}:${lineNum} var "${varName}" value is NaN at time=${t}`)
        } else {
          if (t === cfg.app.initialTime) {
            initialValue = value
          }
          // TODO override with chart min/max years?
          if (t >= cfg.app.startTime && t <= cfg.app.endTime) {
            varValues.push({ x: t, y: value })
          }
        }
      }
      lineNum++
    })
    stream.on('end', () => {
      addValues()
      resolve(log)
    })
  })
}
//
// Helpers
//
let val = (value, defaultValue) => {
  // All CSV values are strings. Empty CSV cells have an empty string value.
  // The CSV parser has already trimmed the string value.
  // Empty cells return an empty string unless a default value is supplied.
  // Undefined values return an empty string.
  // Test the return value with R.isEmpty to see if the cell had a value.
  if (R.isNil(value)) {
    value = ''
  }
  let result = value
  if (R.isEmpty(value) && !R.isNil(defaultValue)) {
    result = defaultValue
  }
  return result
}
let num = value => {
  // If the value can be converted to a number, return a numeric value, otherwise return n unchanged.
  let n = parseFloat(value)
  if (!Number.isNaN(n)) {
    return n
  } else {
    return value
  }
}
let colorForId = colorId => {
  let color = R.find(R.propEq('colorId', colorId), cfg.colors)
  return color ? color.hexCode : ''
}
let viewTitleSection = viewTitle => {
  // Extract the section from a view title if it exists.
  // For example, the section of the view title "Summary > Total" is "Summary".
  return matchRegex(viewTitle, /^(.+) >/)
}
let viewTitleName = viewTitle => {
  // Extract the view name from a view title if it exists.
  // For example, the view name of the view title "Summary > Total" is "Total".
  return matchRegex(viewTitle, /^.* > (.+)/)
}
let exportObj = (name, obj) => {
  let js = `exports.${name} = ${JSON.stringify(obj)}`
  B.emitJs(js)
}

module.exports = {
  initConfig,
  makeModelSpec,
  makeModelConfig,
  makeChartData
}
