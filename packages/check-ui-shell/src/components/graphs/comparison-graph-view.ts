// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ChartDataSets } from 'chart.js'
import { Chart } from 'chart.js'
import type { ComparisonGraphPlot, ComparisonGraphViewModel, Point } from './comparison-graph-vm'

const gridColor = '#444'
const fontFamily = 'Roboto Condensed'
const fontSize = 14
const fontColor = '#777'

const TRANSPARENT = 'rgba(0, 0, 0, 0)'

// XXX: When a single-point ref plot uses "fill between/above/below", Chart.js doesn't
// fill the region, so we use a custom plugin to handle this case
const singlePointFillToNextPlugin: Chart.PluginServiceRegistrationOptions = {
  beforeDatasetsDraw: chart => {
    const ctx = chart.ctx
    ctx.save()

    const datasets = chart.data.datasets
    for (let i = 0; i < datasets.length; i++) {
      const dataset = datasets[i]
      if (dataset.data.length !== 1) {
        continue
      }

      const meta0 = chart.getDatasetMeta(i)
      const p0 = meta0.data[0]

      let p1: Point
      if (dataset.fill === '+1') {
        // Draw to the point in the next dataset
        if (i + 1 >= datasets.length) {
          break
        }
        const meta1 = chart.getDatasetMeta(i + 1)
        const p = meta1.data[0]
        p1 = { x: p._view.x, y: p._view.y }
      } else if (dataset.fill === 'start') {
        // Draw to the bottom of the chart area
        p1 = { x: p0._view.x, y: chart.chartArea.bottom }
      } else if (dataset.fill === 'end') {
        // Draw to the top of the chart area
        p1 = { x: p0._view.x, y: chart.chartArea.top }
      } else {
        return
      }

      ctx.beginPath()
      ctx.moveTo(p0._view.x, p0._view.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.closePath()
      ctx.strokeStyle = dataset.backgroundColor as string
      ctx.lineWidth = 4
      ctx.stroke()
    }

    ctx.restore()
  }
}
Chart.pluginService.register(singlePointFillToNextPlugin)

/**
 * Wraps a native chart element.
 */
export class ComparisonGraphView {
  private chart: Chart

  constructor(readonly canvas: HTMLCanvasElement, readonly viewModel: ComparisonGraphViewModel) {
    this.chart = createChart(canvas, viewModel)
  }

  /**
   * Update the view when one or more "mutable" properties in the view model has changed.
   */
  update(): void {
    // Currently the only properties that are expected to change after initialization
    // are the y-axis min/max values
    const chart = this.chart
    function updateHiddenScatterPoint(label: string, y: number | undefined): void {
      const dataset = chart.data.datasets.find(d => d.label === label)
      if (dataset) {
        const p = dataset.data[0] as Point
        p.y = y
      }
    }
    if (chart) {
      updateHiddenScatterPoint('hidden-y-min', this.viewModel.yMin)
      updateHiddenScatterPoint('hidden-y-max', this.viewModel.yMax)
      chart.update()
    }
  }

  /**
   * Destroy the chart and any associated resources.
   */
  destroy(): void {
    this.chart?.destroy()
    this.chart = undefined
  }
}

function createChart(canvas: HTMLCanvasElement, viewModel: ComparisonGraphViewModel): Chart {
  const datasets: ChartDataSets[] = []

  const addHiddenScatterPoint = (label: string, x: number, y: number | undefined) => {
    datasets.push({
      label,
      type: 'scatter',
      fill: false,
      borderColor: TRANSPARENT,
      backgroundColor: TRANSPARENT,
      pointHitRadius: 0,
      pointHoverRadius: 0,
      pointRadius: 0,
      data: [{ x, y }]
    })
  }

  let dataMaxX = Number.NEGATIVE_INFINITY
  function addPlot(plot: ComparisonGraphPlot): void {
    let borderDash: number[]
    let fill: string | boolean = false
    switch (plot.style) {
      case 'dashed':
        borderDash = [8, 2]
        break
      case 'fill-to-next':
        fill = '+1'
        break
      case 'fill-above':
        fill = 'end'
        break
      case 'fill-below':
        fill = 'start'
        break
      default:
        break
    }

    let backgroundColor = undefined
    if (fill !== false) {
      // Make the fill less translucent when there is only a single point
      const opacity = plot.points.length > 1 ? 0.1 : 0.3
      backgroundColor = `rgba(0, 128, 0, ${opacity})`
    }

    let pointRadius = 0
    let pointBackgroundColor = undefined
    if (plot.points.length === 1 && plot.style !== 'dashed') {
      pointRadius = 5
      pointBackgroundColor = plot.color
    }

    // Find the maximum x value in the datasets
    for (const p of plot.points) {
      if (p.x > dataMaxX) {
        dataMaxX = p.x
      }
    }

    datasets.push({
      data: plot.points,
      borderColor: plot.color,
      borderWidth: plot.lineWidth !== undefined ? plot.lineWidth : 3,
      borderDash,
      backgroundColor,
      fill,
      pointRadius,
      pointBackgroundColor,
      pointBorderWidth: 0,
      pointBorderColor: 'transparent',
      lineTension: 0
    })
  }

  // Add the right data points first so that they are drawn on top of the
  // left data points
  for (const plot of viewModel.plots) {
    addPlot(plot)
  }

  // Customize the x-axis range
  const xMin = viewModel.xMin
  const xMax = viewModel.xMax
  // XXX: Omit the 1990 label to avoid overlap issues
  const omitFirstTick = xMin === 1990

  // Add two hidden scatter points that can be used to ensure consistent y-axis min/max
  // for all graphs in a row of graphs.  The values can be updated later as needed.
  const hiddenPointX = xMax !== undefined ? xMax : dataMaxX
  addHiddenScatterPoint('hidden-y-min', hiddenPointX, viewModel.yMin)
  addHiddenScatterPoint('hidden-y-max', hiddenPointX, viewModel.yMax)

  return new Chart(canvas, {
    type: 'line',
    data: {
      datasets
    },
    options: {
      // Use built-in responsive resizing support.  Note that for this to work
      // correctly, the canvas parent must be a container with a fixed size
      // (in `vw` units) and `position: relative`.  For more information:
      //   https://www.chartjs.org/docs/latest/general/responsive.html
      responsive: true,
      maintainAspectRatio: false,

      // Disable animation
      animation: { duration: 0 },
      hover: { animationDuration: 0 },
      responsiveAnimationDuration: 0,

      // Disable the built-in title and legend
      title: { display: false },
      legend: { display: false },

      // Don't show points
      elements: {
        point: {
          radius: 0
        }
      },

      // Customize tooltip font
      tooltips: {
        titleFontFamily: fontFamily,
        bodyFontFamily: fontFamily
      },

      // Axis configurations
      scales: {
        xAxes: [
          {
            type: 'linear',
            position: 'bottom',
            gridLines: {
              color: gridColor
            },
            ticks: {
              maxTicksLimit: 6,
              maxRotation: 0,
              min: xMin,
              max: xMax,
              fontFamily,
              fontSize,
              fontColor,
              callback: (value, index) => (omitFirstTick && index === 0 ? '' : value)
            }
          }
        ],
        yAxes: [
          {
            gridLines: {
              color: gridColor
            },
            ticks: {
              fontFamily,
              fontSize,
              fontColor
            }
          }
        ]
      }
    }
  })
}
