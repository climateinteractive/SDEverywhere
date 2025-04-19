import type { ChartConfiguration, ChartData, ChartDataSets } from 'chart.js'
import { Chart } from 'chart.js'

import type { GraphSpec, OutputVarId, Series, StringKey } from '@core'

import type { GraphViewModel } from './graph-vm'

/**
 * Options for graph view styling.
 */
export interface GraphViewOptions {
  /** CSS-style font family string (can include comma-separated fallbacks). */
  fontFamily?: string
  /** CSS-style font style. */
  fontStyle?: string
  /** CSS-style hex color. */
  fontColor?: string
}

/**
 * Wraps a native chart element.
 */
export class GraphView {
  private chart: Chart

  constructor(readonly canvas: HTMLCanvasElement, readonly viewModel: GraphViewModel, options: GraphViewOptions) {
    this.chart = createChart(canvas, viewModel, options)
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

function createChart(canvas: HTMLCanvasElement, viewModel: GraphViewModel, options: GraphViewOptions): Chart {
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
  const xAxisLabel = stringForKey(viewModel, graphSpec.xAxisLabelKey)
  const yAxisLabel = stringForKey(viewModel, graphSpec.yAxisLabelKey)
  chartJsConfig.options.scales.xAxes[0].scaleLabel.labelString = xAxisLabel
  chartJsConfig.options.scales.yAxes[0].scaleLabel.labelString = yAxisLabel

  // Apply the font options for labels and ticks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFontOptions(obj: any | undefined) {
    if (obj) {
      obj.fontFamily = options.fontFamily
      obj.fontStyle = options.fontStyle
      obj.fontColor = options.fontColor
    }
  }
  applyFontOptions(chartJsConfig.options.scales.xAxes[0].scaleLabel)
  applyFontOptions(chartJsConfig.options.scales.yAxes[0].scaleLabel)
  applyFontOptions(chartJsConfig.options.scales.xAxes[0].ticks)
  applyFontOptions(chartJsConfig.options.scales.yAxes[0].ticks)

  return new Chart(canvas, chartJsConfig)
}

function stringForKey(viewModel: GraphViewModel, key?: StringKey): string | undefined {
  if (key) {
    return viewModel.getStringForKey(key)
  } else {
    return undefined
  }
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
              display: spec.xAxisLabelKey !== undefined,
              padding: {
                top: 0,
                bottom: 5
              }
            },
            ticks: {
              maxTicksLimit: 6,
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
              suggestedMax: spec.ySoftMax,
              callback: value => {
                return viewModel.formatYAxisTickValue(value as number)
              }
            },
            stacked: isStacked(spec)
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
  const stacked = isStacked(spec)
  const chartDatasets: ChartDataSets[] = []

  for (let varIndex = 0; varIndex < varCount; varIndex++) {
    const chartDataset: ChartDataSets = {}

    const color = spec.datasets[varIndex].color
    const lineStyle = spec.datasets[varIndex].lineStyle
    // const lineStyleModifiers = spec.datasets[varIndex].lineStyleModifiers || []
    if (stacked && lineStyle === 'area') {
      // This is an area section of a stacked chart; display it with fill style
      // and disable the border (which would otherwise make the section appear
      // larger than it should be, and would cause misalignment with the ref line).
      chartDataset.fill = true
      chartDataset.borderColor = 'rgba(0, 0, 0, 0)'
      chartDataset.backgroundColor = color
    } else if (lineStyle === 'scatter') {
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
  function getSeries(varId: OutputVarId, sourceName?: string): Series | undefined {
    const series = viewModel.getSeriesForVar(varId, sourceName)
    if (!series) {
      console.error(`ERROR: No data available for ${varId} (source=${sourceName || 'model'})`)
    }
    return series
  }

  const visibleDatasetSpecs = viewModel.getDatasets?.() || viewModel.spec.datasets
  const varCount = chartData.datasets.length
  for (let varIndex = 0; varIndex < varCount; varIndex++) {
    const specDataset = viewModel.spec.datasets[varIndex]
    const varId = specDataset.varId
    const sourceName = specDataset.externalSourceName
    const series = getSeries(varId, sourceName)
    if (series) {
      chartData.datasets[varIndex].data = series.points
    }
    const visible = visibleDatasetSpecs.find(d => d.varId === varId && d.externalSourceName === sourceName)
    chartData.datasets[varIndex].hidden = visible === undefined
  }
}

function isStacked(spec: GraphSpec): boolean {
  // A graph that includes a plot with a line style of area is a stacked graph.
  // Note that other plot line styles are ignored, except for the special case
  // where a ref line is specified (with a line style other than 'area').
  return spec.kind === 'stacked-line'
}
