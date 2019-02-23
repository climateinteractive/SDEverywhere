const Chart = require('chart.js')
const R = require('ramda')
const num = require('numbro')
const { app, chartConfig, outputVarNames, TIME_VAR_NAME } = require('./appcfg')
const { str } = require('./ui_config')
const log = require('./log')

// Line width as a fraction of canvas height
const SCALE_LINE_WIDTH = 0.01
// Graph scale font size as a fraction of window height
const SCALE_FONT_SIZE = 0.025
// Graph title font size as a fraction of window height
const CHART_TITLE_FONT_SIZE = 0.035
// Graph legend font size as a fraction of window height
const LEGEND_FONT_SIZE = 0.025
// Color pallettes
const COLORS = app.colors

// Global chart settings
Chart.defaults.global.responsive = false
Chart.defaults.global.defaultFontFamily = 'Roboto, Tahoma, Arial, sans-serif'
Chart.defaults.global.defaultFontStyle = 'normal'
Chart.defaults.global.defaultFontColor = '#231f20'
Chart.defaults.global.legend.display = false
Chart.defaults.global.elements.line.borderWidth = 10
Chart.defaults.global.elements.point.radius = 0

// Charts and data
let charts = []
let chartData = []
let chartIds = []

// The number of charts must be set before this module can be used.
let numCharts
let setNumCharts = n => (numCharts = n)

let setChartData = (operation, outputs, currentChartIds, selectedChart = -1) => {
  // Set operation to 'create' to create new datasets.
  // Set operation to 'update' to update data in existing datasets.
  // Set selectedChart to a chart index to only set data for one chart.
  // Format into an array of objects, one for each time step.
  // This updates the global chartData array.
  let time = 0
  let isNum = x => {
    // A number is valid if is not approximately equal to SDEverywhere's representation of :NA:.
    const NA = -Number.MAX_VALUE / 2
    return x > NA
  }
  let values = outputs.split('\t')
  // log(`setChartData(${operation}): values length = ${values.length}`);
  let modelData = []
  for (let iChart = 0; iChart < numCharts; iChart++) {
    if (selectedChart >= 0 && iChart != selectedChart) {
      continue
    }
    chartIds = currentChartIds
    let i = 0
    let chartCfg = chartConfig[chartIds[iChart]]
    modelData[iChart] = []
    for (let iVar = 0; iVar < chartCfg.varNames.length; iVar++) {
      modelData[iChart].push([])
    }
    for (let value of values) {
      if (value === '') {
        // Skip the empty value that comes after the final tab.
        // log(`empty value at index ${i}`);
      } else if (outputVarNames[i] === TIME_VAR_NAME) {
        // Set the time when the time output var comes up.
        time = Number.parseFloat(value)
      } else {
        // Output all data at one time step
        // if (time === 1995 && iChart === 0) {
        //   log(`${outputVarNames[i]}\t${value}`);
        // }
        // If this output var is in the chart, add the time and value to the data set.
        for (let iVar = 0; iVar < chartCfg.varNames.length; iVar++) {
          if (outputVarNames[i] === chartCfg.varNames[iVar]) {
            // Filter out values not in the time range for this chart.
            // Filter out values SDEverywhere represent as :NA:.
            if (time >= chartCfg.xMin && time <= chartCfg.xMax && isNum(value)) {
              modelData[iChart][iVar].push({ x: time, y: Number.parseFloat(value) })
            }
            // Inspect data here
            // if (time === 2050 && outputVarNames[i] === '_crops_imported') {
            //   log(`[${time}] ${value}`);
            // }
          }
        }
      }
      // Go to the next output variable.
      i += 1
      // Recycle the index when we have reached the end of the output variables.
      if (i >= outputVarNames.length) {
        i = 0
      }
    }
    // Set the chartData array for the chart from modelData.
    if (operation === 'create') {
      chartData[iChart] = { datasets: [] }
    }
    let nDatasets = chartCfg.varNames.length
    for (let iDataset = 0; iDataset < nDatasets; iDataset++) {
      if (operation === 'create') {
        let dataset = {
          data: modelData[iChart][iDataset]
        }
        let color = chartCfg.colors[iDataset]
        dataset.fill = isStackedChart(iChart)
        dataset.borderCapStyle = isStackedChart(iChart) ? 'butt' : 'round'
        dataset.borderColor = COLORS[color]
        dataset.backgroundColor = COLORS[color]
        dataset.pointHitRadius = 3
        if (chartCfg.lineStyle && chartCfg.lineStyle[iDataset] === 'dot') {
          dataset.borderDash = [0.4, 10]
          dataset.borderWidth = Chart.defaults.global.elements.line.borderWidth * 0.5
        }
        if (chartCfg.lineStyle && chartCfg.lineStyle[iDataset] === 'thinline') {
          dataset.borderWidth = Chart.defaults.global.elements.line.borderWidth * 0.35
        }
        chartData[iChart].datasets[iDataset] = dataset
      } else if (operation === 'update') {
        chartData[iChart].datasets[iDataset].data = modelData[iChart][iDataset]
      }
    }
    // log(chartData[iChart])
    // Build legend HTML based on the chart series.
    $('#legend' + iChart).remove()
    $('#legendContainer' + iChart).append(buildLegend(iChart))
  }
}
let createChart = iChart => {
  // Set chart defaults based on the current window height.
  let clientHeight = window.innerHeight
  let titleFontSize = clientHeight * CHART_TITLE_FONT_SIZE
  let scaleFontSize = clientHeight * SCALE_FONT_SIZE
  let legendFontSize = clientHeight * LEGEND_FONT_SIZE
  let lineWidth = clientHeight * SCALE_LINE_WIDTH
  Chart.defaults.global.elements.line.borderWidth = lineWidth
  // Create a chart object on a canvas element using the configuration for the selected chart.
  // Call setChartData first to configure some properties tied to the chart data.
  let chartCfg = chartConfig[chartIds[iChart]]
  // log(chartCfg)
  let id = `canvas${iChart}`
  let ctx = document.getElementById(id)
  let yFormat = chartCfg.yFormat || '0'
  charts[iChart] = new Chart(ctx, {
    type: 'line',
    data: chartData[iChart],
    options: {
      title: {
        display: true,
        text: str(chartCfg.title),
        fontSize: titleFontSize,
        fontStyle: 'normal',
        padding: 10 // TODO this does not seem to have an effect
      },
      scales: {
        xAxes: [
          {
            type: 'linear',
            position: 'bottom',
            ticks: {
              maxTicksLimit: 6,
              maxRotation: 0,
              fontSize: scaleFontSize,
              min: chartCfg.xMin,
              max: chartCfg.xMax
            }
          }
        ],
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: str(chartCfg.yAxisLabel),
              fontSize: legendFontSize
            },
            ticks: {
              beginAtZero: chartCfg.beginYAxisAtZero !== false,
              min: chartCfg.yMin,
              max: chartCfg.yMax,
              fontSize: scaleFontSize,
              callback: value => num(value).format(yFormat)
            },
            stacked: isStackedChart(iChart)
          }
        ]
      }
    }
  })
}
let createCharts = () => {
  for (let iChart = 0; iChart < numCharts; iChart++) {
    createChart(iChart)
  }
}
let updateCharts = () => {
  for (let iChart = 0; iChart < numCharts; iChart++) {
    charts[iChart].update()
  }
}
let labelMatches = (iChart, iDataset, string) => {
  let result = false
  let chartCfg = chartConfig[chartIds[iChart]]
  if (chartCfg.xAxisLabels) {
    result = chartCfg.xAxisLabels[iDataset].includes(string)
  }
  return result
}
let isStackedChart = iChart => {
  // A chart that includes a plot with a line style of area is a stacked chart.
  // Note that other plot line styles are ignored.
  let chartCfg = chartConfig[chartIds[iChart]]
  return chartCfg.lineStyle && R.contains('area', chartCfg.lineStyle)
}
let buildLegend = iChart => {
  // log(`buildLegend ${iChart}`)
  let s = `<div class="legend" id="legend${iChart}">`
  let chartCfg = chartConfig[chartIds[iChart]]
  if (chartCfg.xAxisLabels) {
    let maxLabelLength = R.reduce((max, id) => Math.max(max, str(id).length), 0, chartCfg.xAxisLabels)
    let nDatasets = chartCfg.xAxisLabels.length
    for (let iDataset = 0; iDataset < nDatasets; iDataset++) {
      if (chartCfg.xAxisLabels[iDataset]) {
        let label = str(chartCfg.xAxisLabels[iDataset])
        let color = chartCfg.colors[iDataset]
        // Use dark text on the bright yellow Paris outcome background color.
        let textColor = labelMatches(iChart, iDataset, 'paris_outcome') ? '; color: #231f20;' : ''
        let fontSize = nDatasets > 6 || maxLabelLength > 30 ? '; font-size: 0.8em;' : ''
        s += `<div class="legend-item" style="background-color: ${COLORS[color]}${textColor}${fontSize}">${label}</div>`
      }
    }
  }
  s += '</div>'
  return s
}
let destroyChart = iChart => {
  if (charts[iChart]) {
    charts[iChart].destroy()
  }
}

module.exports = {
  setNumCharts,
  setChartData,
  createChart,
  createCharts,
  updateCharts,
  destroyChart
}
