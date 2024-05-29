import type { ChartConfiguration, ChartData, ChartDataSets } from 'chart.js'
import { Chart } from 'chart.js'

import type { GraphSpec, GraphViewModel } from './graph-vm'

/**
 * Wraps a native chart element.
 */
export class GraphView {
  private chart: Chart

  constructor(readonly canvas: HTMLCanvasElement, readonly viewModel: GraphViewModel /*, options: GraphViewOptions*/) {
    this.chart = createChart(canvas, viewModel /*, options*/)
  }

  /**
   * Update the chart to reflect the latest data from the model.
   * This should be called after the model has produced new outputs.
   *
   * @param animated Whether to animate the data when it is updated.
   */
  updateData(animated = true) {
    if (this.chart) {
      // Update the chart data
      updateLineChartJsData(this.viewModel, this.chart.data)

      // Refresh the chart view
      this.chart.update(animated ? undefined : { duration: 0 })
    }
  }

  /**
   * Destroy the chart and any associated resources.
   */
  destroy() {
    this.chart?.destroy()
    this.chart = undefined
  }
}

function createChart(canvas: HTMLCanvasElement, viewModel: GraphViewModel /*, options: GraphViewOptions*/): Chart {
  // Create the chart data and config depending on the given style
  const chartData = createLineChartJsData(viewModel.spec)
  const chartJsConfig = lineChartJsConfig(viewModel, chartData)
  updateLineChartJsData(viewModel, chartData)

  // Use built-in responsive resizing support.  Note that for this to work
  // correctly, the canvas parent must be a container with a fixed size
  // (in `px` or `vw` units) and `position: relative`.  For more information:
  //   https://www.chartjs.org/docs/latest/general/responsive.html
  chartJsConfig.options.responsive = true
  chartJsConfig.options.maintainAspectRatio = false

  // Disable the built-in title and legend
  chartJsConfig.options.title = { display: false }
  chartJsConfig.options.legend = { display: false }

  // Don't show points
  chartJsConfig.options.elements = {
    point: {
      radius: 0
    }
  }

  // Set the initial (translated) axis labels
  const graphSpec = viewModel.spec
  chartJsConfig.options.scales.xAxes[0].scaleLabel.labelString = graphSpec.xAxisLabel
  chartJsConfig.options.scales.yAxes[0].scaleLabel.labelString = graphSpec.yAxisLabel

  // // Apply the font options for labels and ticks
  // // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // function applyFontOptions(obj: any | undefined) {
  //   if (obj) {
  //     obj.fontFamily = options.fontFamily
  //     obj.fontStyle = options.fontStyle
  //     obj.fontColor = options.fontColor
  //   }
  // }
  // applyFontOptions(chartJsConfig.options.scales.xAxes[0].scaleLabel)
  // applyFontOptions(chartJsConfig.options.scales.yAxes[0].scaleLabel)
  // applyFontOptions(chartJsConfig.options.scales.xAxes[0].ticks)
  // applyFontOptions(chartJsConfig.options.scales.yAxes[0].ticks)

  return new Chart(canvas, chartJsConfig)
}

function lineChartJsConfig(viewModel: GraphViewModel, data: ChartData): ChartConfiguration {
  const spec = viewModel.spec

  const chartConfig: ChartConfiguration = {
    type: 'line',
    data,
    options: {
      scales: {
        xAxes: [
          {
            type: 'linear',
            position: 'bottom',
            scaleLabel: {
              display: spec.xAxisLabel !== undefined,
              padding: {
                top: 0,
                bottom: 5
              }
            },
            ticks: {
              // maxTicksLimit: 10,
              maxRotation: 0,
              min: spec.xMin,
              max: spec.xMax
            }
          }
        ],
        yAxes: [
          {
            scaleLabel: {
              display: true
            },
            ticks: {
              beginAtZero: true,
              min: spec.yMin,
              max: spec.yMax,
              suggestedMax: spec.ySoftMax
              // callback: value => {
              //   return viewModel.formatYAxisTickValue(value as number)
              // }
            }
          }
        ]
      },
      tooltips: {
        enabled: false // TODO: Make configurable
      }
    }
  }

  return chartConfig
}

function createLineChartJsData(spec: GraphSpec): ChartData {
  const varCount = spec.datasets.length
  const chartDatasets: ChartDataSets[] = []

  for (let varIndex = 0; varIndex < varCount; varIndex++) {
    const chartDataset: ChartDataSets = {}

    const specDataset = spec.datasets[varIndex]
    const color = specDataset.color
    const lineStyle = specDataset.lineStyle
    // const lineStyleModifiers = specDataset.lineStyleModifiers || []
    if (lineStyle === 'scatter') {
      // This is a scatter plot.  We configure the chart type and dot color here,
      // but the point radius will be configured in `applyScaleFactors`.
      chartDataset.type = 'scatter'
      chartDataset.fill = false
      chartDataset.borderColor = 'rgba(0, 0, 0, 0)'
      chartDataset.backgroundColor = color
    } else {
      // This is a line plot. Always specify a background color even if fill is
      // disabled; this ensures that the color square is correct for tooltips.
      chartDataset.backgroundColor = color
      // This is a normal line plot; no fill
      chartDataset.fill = false
      if (lineStyle === 'none') {
        // Make the line transparent (typically only used for confidence intervals)
        chartDataset.borderColor = 'rgba(0, 0, 0, 0)'
      } else {
        // Use the specified color for the line
        chartDataset.borderColor = color
        chartDataset.borderCapStyle = 'round'
        chartDataset.borderWidth = lineStyle === 'wide' ? 8 : 4
      }
    }

    chartDataset.pointHitRadius = 3
    chartDataset.pointHoverRadius = 0

    chartDatasets.push(chartDataset)
  }

  return {
    datasets: chartDatasets
  }
}

function updateLineChartJsData(viewModel: GraphViewModel, chartData: ChartData): void {
  const varCount = chartData.datasets.length
  for (let varIndex = 0; varIndex < varCount; varIndex++) {
    const specDataset = viewModel.spec.datasets[varIndex]
    const varId = specDataset.varId
    const points = viewModel.data.get(varId)
    if (points !== undefined) {
      chartData.datasets[varIndex].data = points
    } else {
      // console.error(`ERROR: No data available for ${varId}`)
    }
  }
}
