#!/usr/bin/env node
const path = require('path')
const R = require('ramda')
const yaml = require('js-yaml')
const prettier = require('prettier')
const parse = require('minimist')
const B = require('bufx')
const { canonicalName, strings, stringToId } = require('./Helpers')

let cfg, sliders, inputVarNames, outputVarNames
let yamlPathname, specPathname, cfgPathname, stringsPathname

let init = (modelDir, webDir) => {
  yamlPathname = path.join(modelDir, 'app.yaml')
  specPathname = path.join(modelDir, 'web_spec.json')
  if (webDir) {
    cfgPathname = path.join(webDir, 'model_config.js')
    stringsPathname = path.join(webDir, 'strings.js')
  }
  cfg = {}
  sliders = {}
  inputVarNames = []
  outputVarNames = []
  B.clearBuf()
}
let exportObj = (name, obj) => {
  let js = `exports.${name} = ${JSON.stringify(obj)}`
  B.emitJs(js)
}
let parseCfg = () => {
  // Parse the app.yaml file in the app directory.
  let data = B.read(yamlPathname)
  cfg = yaml.safeLoad(data)
}
let getVarNames = () => {
  // Compile a list of input and output variable names.
  for (let sliderName in cfg.app.sliders) {
    inputVarNames.push(sliderName)
  }
  for (let section of cfg.views) {
    // TODO allow slider object overrides and additions at the section and view levels
    for (let view of section.views) {
      if (view.graphs) {
        for (let graph of view.graphs) {
          for (let plot of graph.plots) {
            outputVarNames.push(plot.name)
          }
        }
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
  if (cfg.app) {
    let app = {}
    app.title = stringToId(cfg.app.title)
    app.logo = cfg.app.logo
    app.version = cfg.app.version
    app.help_url = cfg.app.help_url
    app.colors = cfg.app.colors
    app.initialView = stringToId(cfg.app.initial_view)
    app.trackSliders = cfg.app.track_sliders || false
    // Fill out slider definitions indexed by name for the app.
    for (let sliderName in cfg.app.sliders) {
      let slider = cfg.app.sliders[sliderName]
      if (R.has('label', slider) && R.has('max', slider) && R.has('step', slider)) {
        let appSlider = {
          name: canonicalName(sliderName),
          label: stringToId(slider.label),
          value: slider.value || 0,
          minValue: slider.min || 0,
          maxValue: slider.max,
          step: slider.step
        }
        if (R.has('units', slider)) {
          appSlider.units = stringToId(slider.units)
        }
        if (R.has('format', slider)) {
          appSlider.format = slider.format
        }
        sliders[appSlider.name] = appSlider
      } else {
        console.error(`warning: the ${sliderName} app slider does not have label, max, and step`)
      }
    }
    exportObj('app', app)
  }
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
  for (let section of cfg.views) {
    sectionMenu = {}
    sectionSubmenu = []
    sectionMenu.id = stringToId(section.title)
    for (let view of section.views) {
      let viewId = stringToId(`${section.title} > ${view.title}`)
      sectionSubmenu.push({ id: viewId, label: stringToId(view.title) })
    }
    sectionMenu.submenu = sectionSubmenu
    toplevelSubmenu.push(sectionMenu)
  }
  topLevelMenu.submenu = toplevelSubmenu
  appMenu.push(topLevelMenu)
  // Help menu
  if (cfg.app && (cfg.app.version || (cfg.app.help_url && cfg.app.title))) {
    topLevelMenu = { id: stringToId('Help') }
    toplevelSubmenu = []
    if (cfg.app.version) {
      toplevelSubmenu.push({
        label: `Version ${cfg.app.version}`,
        enabled: false
      })
    }
    if (cfg.app.help_url && cfg.app.title) {
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
  // Compile the configuration for each chart.
  // fossil_fuel_emissions_by_country_group_1r: {
  //   title: 'fossil_fuel_emissions',
  //   yAxisLabel: 'ya_gigatons_co2_year',
  //   yMax: 120,
  //   varNames: ['_global_co2_ff_emissions'],
  //   xAxisLabels: ['global'],
  //   colors: ['COLOR_REGION_1']
  // }
  // Chart properties:
  //   beginYAxisAtZero
  //   colors
  //   lineStyle
  //   title
  //   varNames
  //   xAxisLabels
  //   xMax
  //   xMin
  //   yAxisLabel
  //   yMax
  //   yMin

  let chartConfig = {}
  for (let section of cfg.views) {
    for (let view of section.views) {
      if (view.graphs) {
        for (let graph of view.graphs) {
          let id = stringToId(graph.title)
          let chart = {}
          if (R.has('title', graph)) {
            chart.title = stringToId(graph.title)
          }
          if (graph.x_axis) {
            // TODO Add this to the UI?
            // if (R.has('label', graph.x_axis)) {
            // }
            if (R.has('min', graph.x_axis)) {
              chart.xMin = graph.x_axis.min
            }
            if (R.has('max', graph.x_axis)) {
              chart.xMax = graph.x_axis.max
            }
          } else {
            console.error(
              `warning: the ${section.title} > ${view.title} > ${graph.title} graph does not have an x_axis`
            )
          }
          if (graph.y_axis) {
            if (R.has('units', graph.y_axis)) {
              chart.yAxisLabel = stringToId(graph.y_axis.units)
            }
            if (R.has('format', graph.y_axis)) {
              chart.yFormat = graph.y_axis.format
            }
            if (R.has('min', graph.y_axis)) {
              chart.yMin = graph.y_axis.min
            }
            if (R.has('max', graph.y_axis)) {
              chart.yMax = graph.y_axis.max
            }
          } else {
            console.error(`warning: the ${section.title} > ${view.title} > ${graph.title} graph does not have a y_axis`)
          }
          for (let plot of graph.plots) {
            if (R.has('name', plot) && R.has('label', plot)) {
              if (!chart.varNames) {
                chart.varNames = []
              }
              if (!chart.xAxisLabels) {
                chart.xAxisLabels = []
              }
              chart.varNames.push(canonicalName(plot.name))
              chart.xAxisLabels.push(stringToId(plot.label))
              // TODO check if color or style is missing once one is defined
              if (R.has('color', plot)) {
                if (!chart.colors) {
                  chart.colors = []
                }
                chart.colors.push(plot.color)
              }
              if (R.has('style', plot)) {
                if (!chart.lineStyle) {
                  chart.lineStyle = []
                }
                chart.lineStyle.push(plot.style)
              }
            } else {
              console.error(
                `warning: a ${section.title} > ${view.title} > ${graph.title} plot does not have a name and label`
              )
            }
          }
          chartConfig[id] = chart
        }
      }
    }
  }
  exportObj('chartConfig', chartConfig)
}
let emitViews = () => {
  let viewConfig = {}
  for (let section of cfg.views) {
    for (let view of section.views) {
      let viewId = stringToId(`${section.title} > ${view.title}`)
      let appView = { title: stringToId(view.title), chartIds: [], sliders: [] }
      if (view.graphs) {
        for (let graph of view.graphs) {
          if (R.has('title', graph)) {
            appView.chartIds.push(stringToId(graph.title))
          }
        }
      }
      // Resolve the full slider definition for each slider by name.
      if (section.sliders) {
        for (let sliderName of section.sliders) {
          if (!sliderName) {
            // Emit an empty object for a blank slider.
            appView.sliders.push({})
          } else {
            let name = canonicalName(sliderName)
            let slider = sliders[name]
            if (slider) {
              appView.sliders.push(slider)
            } else {
              console.error(`warning: slider "${sliderName}" is defined in a view but does not exist`)
            }
          }
        }
      }
      viewConfig[viewId] = appView
    }
  }
  exportObj('viewConfig', viewConfig)
}
let emitStrings = () => {
  let stringMap = {}
  for (var i = 0; i < strings.length; i++) {
    let id = `id${i}`
    stringMap[id] = { EN: strings[i] }
  }
  let js = `module.exports = ${JSON.stringify(stringMap)}`
  B.emitJs(js)
}
let emitSpec = () => {
  let spec = {}
  if (cfg.app) {
    if (cfg.app.title) {
      spec.name = cfg.app.title
    }
    if (cfg.app.datfiles) {
      spec.datfiles = cfg.app.datfiles
    }
    if (cfg.app.removalKeys) {
      spec.removalKeys = cfg.app.removalKeys
    }
    if (cfg.app.specialSeparationDims) {
      spec.specialSeparationDims = cfg.app.specialSeparationDims
    }
  }
  spec.inputVars = inputVarNames
  spec.outputVars = outputVarNames
  B.emitJson(spec)
}
let makeModelSpec = modelDir => {
  try {
    init(modelDir)
    parseCfg()
    getVarNames()
    emitSpec()
    B.writeBuf(specPathname)
    return specPathname
  } catch (e) {
    console.error(e.message)
    console.error(e.stack)
  }
}
let makeModelConfig = (modelDir, webDir) => {
  try {
    init(modelDir, webDir)
    parseCfg()
    getVarNames()
    emitConsts()
    emitApp()
    emitVars()
    emitMenu()
    emitCharts()
    emitViews()
    B.writeBuf(cfgPathname)
    B.clearBuf()
    emitStrings()
    B.writeBuf(stringsPathname)
    return [cfgPathname, stringsPathname]
  } catch (e) {
    console.error(e.message)
    console.error(e.stack)
  }
}
module.exports = {
  makeModelConfig,
  makeModelSpec
}
